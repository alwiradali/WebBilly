import asyncio, json, os
from playwright.async_api import async_playwright

DIST='/home/user/WebBilly/dist/molecular-miracles'
pages=[]
for dp,_,fs in os.walk(DIST):
    for f in sorted(fs):
        if f.endswith('.html'):
            pages.append(os.path.relpath(os.path.join(dp,f),DIST))
pages.sort()

async def main():
    out={}
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg=await b.new_page()
        # block everything external so scripts can't mutate content from the network
        await pg.route('**/*', lambda r: r.continue_() if 'localhost' in r.request.url else asyncio.ensure_future(r.abort()))
        for rel in pages:
            await pg.goto('http://localhost:8900/'+rel)
            await pg.wait_for_timeout(700)
            items=await pg.evaluate('window.__mmContent ? window.__mmContent.collectForExport() : null')
            if items is None:
                print('NO BRIDGE:',rel); continue
            out[rel]=items
        await b.close()
    json.dump(out,open('extracted.json','w'))
    for rel in pages:
        n=len(out.get(rel,[]))
        print(f'{rel}: {n} blocks')
asyncio.run(main())
