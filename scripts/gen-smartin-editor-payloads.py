"""Turn extracted-smartin.json into one WordPress page payload per site page,
written to scripts/smartin-editor-seed/<slug>.json.
"""
import json, os, html, re

DOMAIN='https://smartinscience.co.uk'
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'smartin-editor-seed')
data=json.load(open('extracted-smartin.json'))

def meta(rel):
    parts=rel[:-5].split('/')
    if parts[-1]=='index': parts=parts[:-1]
    if not parts: return 'home','Home page',0
    slug='-'.join(parts)
    if parts[0]=='areas' and len(parts)>1:
        return slug,'Area: '+parts[1].replace('-',' ').title(),40
    if parts==['areas']: return slug,'Areas page',30
    if parts==['faqs']: return slug,'FAQs page',5
    return slug,parts[-1].replace('-',' ').title()+' page',50

def block(item):
    t=item['tag']
    if t=='img':
        src=item['src']
        if src.startswith('/'): src=DOMAIN+src
        elif not src.startswith('http'): src=DOMAIN+'/'+src.lstrip('./')
        if not src.startswith('http'): return None
        alt=html.escape(item.get('alt',''),quote=True)
        return ('<!-- wp:image -->\n<figure class="wp-block-image"><img src="%s" alt="%s"/></figure>\n<!-- /wp:image -->' % (src,alt))
    inner=item['html']
    if t in ('h1','h2','h3'):
        lvl=t[1]
        return ('<!-- wp:heading {"level":%s} -->\n<%s class="wp-block-heading">%s</%s>\n<!-- /wp:heading -->' % (lvl,t,inner,t))
    if t=='p':
        return '<!-- wp:paragraph -->\n<p>%s</p>\n<!-- /wp:paragraph -->' % inner
    if t=='ul':
        # wrap each existing <li> in list-item block comments
        lis=inner  # inner is sequence of <li>...</li>
        lis=re.sub(r'<li>', '<!-- wp:list-item -->\n<li>', lis)
        lis=re.sub(r'</li>', '</li>\n<!-- /wp:list-item -->', lis)
        return '<!-- wp:list -->\n<ul class="wp-block-list">%s</ul>\n<!-- /wp:list -->' % lis
    return None

os.makedirs(OUT,exist_ok=True)
index=[]
for rel,items in sorted(data.items()):
    slug,title,order=meta(rel)
    blocks=[b for b in (block(i) for i in items) if b]
    content='\n\n'.join(blocks)
    json.dump({'slug':slug,'title':title,'content':content},
              open(os.path.join(OUT,'%s.json'%slug),'w'))
    index.append((slug,title,len(blocks),len(content)))
for s,t,n,c in index: print(f'{s:28s} {t:28s} {n:3d} blocks {c:6d} chars')
print('total pages:',len(index))
