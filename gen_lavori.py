"""Build lavori.html from src/lavori.tpl.html plus src/projects.json (projects and logo).

    python gen_lavori.py
"""
import io, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')

tpl = io.open(os.path.join(SRC, 'lavori.tpl.html'), encoding='utf-8').read()
store = json.load(io.open(os.path.join(SRC, 'projects.json'), encoding='utf-8'))
data, logos = store['projects'], store['logos']
out = tpl.replace('__DATA__', json.dumps(data, ensure_ascii=False)).replace('__EM__', logos[0]).replace('__STUDIO__', logos[1])
io.open(os.path.join(HERE, 'lavori.html'), 'w', encoding='utf-8').write(out)
print('wrote lavori.html', len(out))
