"""Automated checks for Trazos de Arquitecto.

Run locally:   python3 tests/test_app.py
Needs:         pip install playwright && python -m playwright install chromium
GitHub runs this on every push (.github/workflows/tests.yml).
"""
import asyncio, json, pathlib, sys, unicodedata
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
results = []

def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('  OK  ' if ok else ' FAIL ') + name + (f'  — {detail}' if detail and not ok else ''))

def first_letter(name):
    for art in ('El ', 'La ', 'Los ', 'Las ', 'The '):
        if name.startswith(art): name = name[len(art):]; break
    ch = name[0].upper()
    return ch if ch == 'Ñ' else unicodedata.normalize('NFD', ch)[0]

async def fresh(pg, state=None, profiles=None):
    await pg.goto(URL)
    profiles = profiles or {'cur': 'p1', 'list': [{'id': 'p1', 'color': 'teal'}]}
    await pg.evaluate("([p, s]) => { localStorage.clear(); localStorage.setItem('trazos-arquitecto-perfiles', p); if (s) localStorage.setItem('trazos-arquitecto-v2:p1', s); }",
                      [json.dumps(profiles), json.dumps(state) if state else None])
    await pg.reload(); await pg.wait_for_timeout(250)

async def trace_current(pg):
    """Follow the path of every stroke of the current piece with the mouse."""
    box = await pg.evaluate("(()=>{const r=document.getElementById('stage').getBoundingClientRect();return [r.left,r.top]})()")
    n = await pg.evaluate("__trazos.run.piece.strokes.length")
    for _ in range(n):
        pts = await pg.evaluate("(()=>{const r=__trazos.run; return r.pts.filter((_,i)=>i%3===0).concat([r.pts[r.pts.length-1]]).map(q=>__trazos.toScreen(r.lot,q))})()")
        await pg.mouse.move(box[0]+pts[0][0], box[1]+pts[0][1]); await pg.mouse.down()
        for x, y in pts[1:]: await pg.mouse.move(box[0]+x, box[1]+y)
        await pg.mouse.up(); await pg.wait_for_timeout(60)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1024, 'height': 768})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script("window.__said=[]; speechSynthesis.speak=u=>{__said.push(u.lang+'|'+u.text)};")

        print('Contenido')
        await fresh(pg)
        data = await pg.evaluate("""(() => { const t = __trazos.test;
            return t.PIECES.map(p => ({id:p.id, letter:p.letter||null, es:p.es[0], en:(t.EN[p.id]||[null])[0], n:p.strokes.length})); })()""")
        letters = [d for d in data if d['letter']]
        check('27 letras mayúsculas (A–Z y Ñ)', sorted(d['letter'] for d in letters) == sorted('ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'))
        check('solo mayúsculas', all(d['letter'] == d['letter'].upper() for d in letters))
        bad = [d['letter'] for d in letters if first_letter(d['es']) != d['letter']]
        check('cada edificio en español empieza con su letra', not bad, ' '.join(bad))
        bad = [d['letter'] for d in letters if d['letter'] != 'Ñ' and (not d['en'] or first_letter(d['en']) != d['letter'])]
        check('cada edificio en inglés empieza con su letra', not bad, ' '.join(bad))

        print('Letras dentro del edificio')
        fit = await pg.evaluate("""(() => { const t = __trazos.test, out = [];
          const N = 300, off = 60, cv = document.createElement('canvas'); cv.width = cv.height = N + 2*off; const c = cv.getContext('2d');
          for (const p of t.PIECES.filter(p => p.letter)) {
            const M = q => [off + q[0]*N, off + (q[1]+.1)*N*.9];
            c.clearRect(0,0,cv.width,cv.height); t.setK({ctx:c, z:N, M}); p.art(t.C[p.c], 0);
            const art = c.getImageData(0,0,cv.width,cv.height).data;
            c.clearRect(0,0,cv.width,cv.height); t.setK({ctx:c, z:N, M}); t.drawTrim(p, p.strokes);
            const tr = c.getImageData(0,0,cv.width,cv.height).data;
            let all=0, outside=0; for (let i=3;i<tr.length;i+=4) if (tr[i]>128){ all++; if (art[i]<128) outside++; }
            const low = Math.max(...p.strokes.flat().map(q=>q[1]));
            out.push([p.letter, Math.round(100*outside/all), low]);
          } return out; })()""")
        bad = [f'{l}:{pct}%' for l, pct, _ in fit if pct > 2]
        check('ninguna letra sale de su edificio (≤2%)', not bad, ' '.join(bad))
        bad = [l for l, _, low in fit if low > 0.86]
        check('cada letra deja planta baja (no toca el suelo)', not bad, ' '.join(bad))

        print('Orden de trazos')
        order = await pg.evaluate("""(() => __trazos.test.PIECES.filter(p=>p.letter).map(p => [p.letter, p.strokes.map(st => {
            const a = st[0], b = st[st.length-1], dx = b[0]-a[0], dy = b[1]-a[1];
            if (st.length === 2 && Math.abs(dx) < .02) return dy > 0 ? 'V' : 'v';
            if (st.length === 2 && Math.abs(dy) < .02) return dx > 0 ? 'H' : 'h'; return '-'; }).join('')]))()""")
        bad = [l for l, k in order if 'v' in k or 'h' in k]
        check('verticales hacia abajo y horizontales a la derecha', not bad, ' '.join(bad))
        bad = [l for l, k in order if 'H' in k and 'V' in k and k.rindex('V') > k.index('H')]
        check('vertical antes que horizontal', not bad, ' '.join(bad))

        print('Se puede trazar cada pieza')
        failed = []
        await pg.click('#btnStart')
        for i, d in enumerate(data):
            # load the piece the same way the adult list does
            await pg.evaluate("i => { const btn = document.createElement('button'); btn.className = 'piece'; btn.dataset.i = i; document.getElementById('pieces').appendChild(btn); btn.click(); btn.remove(); }", i)
            await pg.wait_for_timeout(1300)
            await trace_current(pg)
            await pg.wait_for_timeout(150)
            if await pg.evaluate("__trazos.run.phase") not in ('built', 'tour'): failed.append(d['id'])
        check(f'las {len(data)} piezas se completan siguiendo el camino', not failed, ' '.join(failed))

        print('Mapa y voz')
        await fresh(pg, {'city': [d['id'] for d in data][:12], 'level': 0})
        await pg.click('#btnStart'); await pg.wait_for_timeout(300); await pg.click('#btnMap'); await pg.wait_for_timeout(800)
        check('el mapa se dibuja sin errores', not errors, '; '.join(errors[:2]))
        for lang, tag in (('es', 'es-'), ('en', 'en-')):
            await fresh(pg)
            await pg.click(f'.langBtn[data-l={lang}]'); await pg.evaluate("__said.length=0")
            await pg.click('#btnStart'); await pg.wait_for_timeout(600)
            said = await pg.evaluate("__said")
            check(f'voz en {lang} usa solo idioma {tag}…', said and all(s.startswith(tag) for s in said), str(said))
        nxt = await pg.evaluate("(() => { const t = __trazos.test; t.S.level = t.PIECES.findIndex(p=>p.id==='N'); return t.PIECES[t.nextIndex()].id; })()")
        check('en inglés se omite la Ñ', nxt != 'Ñ', nxt)

        print('Perfiles y copia')
        await fresh(pg, {'name': 'Ana', 'city': ['torre', 'casa']},
                    {'cur': 'p1', 'list': [{'id': 'p1', 'color': 'teal'}, {'id': 'p2', 'color': 'brick'}]})
        await pg.click('.kid[data-id=p2]'); await pg.wait_for_timeout(200)
        a = await pg.inner_text('#houseN')
        await pg.click('.kid[data-id=p1]'); await pg.wait_for_timeout(200)
        check('cada niño tiene su propia ciudad', a == '0' and await pg.inner_text('#houseN') == '2')
        await pg.click('#btnStart'); await pg.wait_for_timeout(200)
        await pg.click('#btnAdult'); await pg.wait_for_timeout(100)
        check('un toque corto no abre el menú de adultos', await pg.locator('#adultOv').is_hidden())

        print('Tienda de ladrillos')
        await fresh(pg, {'bricks': 29, 'city': ['torre', 'casa']})
        await pg.click('#btnShop'); await pg.wait_for_timeout(300)
        dis = await pg.evaluate("[...document.querySelectorAll('#shopGrid button')].filter(b=>b.disabled).map(b=>b.dataset.d)")
        check('lo que no alcanza aparece bloqueado', set(dis) == {'statue', 'balloon'}, str(dis))
        await pg.click('#shopGrid button[data-d=tree]'); await pg.wait_for_timeout(300)
        spot = await pg.evaluate("(() => { const d = __trazos.test.S.decor[0]; return [d.i % 4, d.j % 4]; })()")
        check('comprar descuenta ladrillos y coloca en una plaza', await pg.inner_text('#brickN') == '23' and spot == [0, 0], str(spot))

        print('Límite diario')
        await fresh(pg, {'dailyMin': 10, 'city': ['torre'] * 10, 'stats': {'days': {}, 'letters': {}}})
        await pg.click('#btnStart'); await pg.wait_for_timeout(300)
        steps = await pg.evaluate("""(() => { const t = __trazos.test, d = new Date().toLocaleDateString('sv');
            t.S.stats.days[d] = {ms: 11*60000, n: 12}; const out = [];
            for (let k = 0; k < 5; k++){ t.goNext(); out.push(document.getElementById('timeOv').hidden ? 'sigue' : 'descansa'); }
            return out; })()""")
        check('al llegar al límite termina la manzana (máx. 3) y luego descansa', steps[:4] == ['sigue', 'sigue', 'sigue', 'descansa'], str(steps))
        await fresh(pg, {'dailyMin': 10, 'stats': {'days': {__import__('datetime').date.today().isoformat(): {'ms': 700000, 'n': 20}}, 'letters': {}}})
        await pg.click('#btnStart'); await pg.wait_for_timeout(300)
        check('si ya jugó su tiempo, al volver a entrar ve el descanso', await pg.is_visible('#timeOv'))

        print('Viajes por el mundo')
        trips = await pg.evaluate("""(() => { const t = __trazos.test; return t.TRIPS.map(x => [x.id, x.es, x.en,
            x.es.replace(/ /g,'').length, t.nameLetters(x.es).length, x.en.replace(/ /g,'').length, t.nameLetters(x.en).length]); })()""")
        bad = [r[0] for r in trips if r[3] != r[4] or r[5] != r[6]]
        check(f'las {len(trips)} ciudades se pueden construir con las letras del juego', not bad and len(trips) >= 14, ' '.join(bad))
        check('incluye Masaya, Managua, León y Granada', {'masaya','managua','leon','granada'} <= {r[0] for r in trips})
        pts = await pg.evaluate("[18,36,54,72].map(n => __trazos.test.tripPoints(n))")
        check('un viaje a la mitad del barrio (dos en barrios largos)', pts == [[9],[18],[18,36],[27,45]], str(pts))
        await fresh(pg, {'city': ['torre'] * 18, 'level': 3})
        await pg.click('#btnStart'); await pg.wait_for_timeout(200)
        await pg.evaluate("__trazos.test.goNext()"); await pg.wait_for_timeout(200)
        check('al llegar a la mitad aparece la postal del viaje', await pg.is_visible('#tripOv'))
        check('la postal muestra la palabra completa (PISA)', await pg.text_content('#tripWord') == 'PISA')
        await pg.click('#btnTripGo'); await pg.wait_for_timeout(1500)
        check('el viaje empieza por la primera letra (PISA → P)', await pg.evaluate("__trazos.run.piece.id") == 'P')
        strip = await pg.evaluate("[...document.querySelectorAll('#nameStrip span')].map(s => s.textContent).join('')")
        check('la ciudad se ve completa desde el inicio, no letra por letra', strip == 'PISA', strip)

        await fresh(pg, {'city': ['torre'] * 3, 'level': 3})
        await pg.click('#btnPassport'); await pg.wait_for_timeout(200)
        await pg.click('#passGrid [data-trip=roma]'); await pg.wait_for_timeout(200)
        check('desde el pasaporte se puede elegir un lugar (ROMA)', await pg.is_visible('#tripOv') and await pg.text_content('#tripWord') == 'ROMA')
        await pg.click('#btnTripGo'); await pg.wait_for_timeout(1500)
        check('el viaje elegido empieza por su primera letra (ROMA → R)', await pg.evaluate("__trazos.run.piece.id") == 'R')
        check('un viaje elegido no gasta el viaje sorpresa del barrio', await pg.evaluate("(__trazos.test.S.tripMarks||[]).length") == 0)

        print('Errores corregidos (no deben volver)')
        await fresh(pg, {'bricks': 2000, 'city': ['torre']})
        await pg.click('#btnShop'); await pg.wait_for_timeout(200)
        for _ in range(30):
            await pg.evaluate("document.querySelector('#shopGrid button[data-d=tree]').click()"); await pg.wait_for_timeout(30)
            await pg.evaluate("document.getElementById('shopOv').hidden = true")
        n = await pg.evaluate("__trazos.test.S.decor.length")
        check('caben más de 9 decoraciones (había solo 9 plazas)', n == 30, str(n))
        await fresh(pg, {'city': ['torre'] * 18, 'tripMarks': [9, 18], 'trips': [{'id': 'pisa'}]})
        await pg.click('#btnStart'); await pg.wait_for_timeout(200)
        await pg.focus('#btnAdult'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        await pg.click('#btnReset'); await pg.click('#btnReset'); await pg.wait_for_timeout(300)
        left = await pg.evaluate("[(__trazos.test.S.tripMarks||[]).length, (__trazos.test.S.trips||[]).length]")
        check('borrar la ciudad también reinicia los viajes', left == [0, 0], str(left))
        phone = await b.new_page(viewport={'width': 390, 'height': 844})
        await phone.goto(URL); await phone.evaluate("localStorage.clear(); localStorage.setItem('trazos-arquitecto-v2:p1', JSON.stringify({city: Array(18).fill('torre'), trips: 'pisa roma rio leon paris china tokio masaya egipto londres sidney granada managua'.split(' ').map(id => ({id}))}))")
        await phone.reload(); await phone.click('#btnStart'); await phone.wait_for_timeout(200)
        await phone.evaluate("__trazos.test.goNext()"); await phone.wait_for_timeout(200); await phone.click('#btnTripGo'); await phone.wait_for_timeout(1500)
        ny = await phone.evaluate("[...document.querySelectorAll('#nameStrip span')].map(s => s.className === 'gap' ? ' ' : s.textContent).join('')")
        check('NUEVA YORK se ve completa, con su espacio', ny == 'NUEVA YORK', ny)
        check('en teléfono, NUEVA YORK cabe sin salirse de la pantalla', not await phone.evaluate("document.documentElement.scrollWidth > innerWidth"))
        await phone.close()

        print('Repaso inteligente')
        await fresh(pg, {'level': 0, 'skill': {'I': {'lv': 3, 'streak': 0}, 'L': {'lv': 3, 'streak': 0}},
                         'stats': {'days': {}, 'letters': {'I': {'n': 5, 'last': [0, 0]}, 'L': {'n': 5, 'last': [0, 0]},
                                                           'H': {'n': 3, 'last': [70, 60]}, 'E': {'n': 3, 'last': [50, 40]}}}})
        mid = await pg.evaluate("(() => { const t = __trazos.test; t.S.level = 3; t.S.cursor = 3; t.S.rev = 3; return t.PIECES[t.nextIndex()].id; })()")
        check('durante el recorrido vuelve una letra difícil cada 4 edificios', mid in ('H', 'E'), mid)
        counts = await pg.evaluate("""(() => { const t = __trazos.test, c = {};
            t.S.cursor = t.PIECES.length - 1; t.S.recent = [];
            for (let k = 0; k < 3000; k++){ t.S.level = 0; const id = t.PIECES[t.nextIndex()].id; c[id] = (c[id]||0) + 1; } return c; })()""")
        hard = (counts.get('H', 0) + counts.get('E', 0)) / 2
        easy = (counts.get('I', 0) + counts.get('L', 0)) / 2
        check('las letras difíciles salen mucho más que las dominadas', hard > 4 * max(1, easy), f'difíciles {hard:.0f} vs dominadas {easy:.0f}')

        check('sin errores de JavaScript', not errors, '; '.join(errors[:3]))
        await b.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results)-len(failed)}/{len(results)} pruebas pasaron')
    sys.exit(1 if failed else 0)

asyncio.run(main())
