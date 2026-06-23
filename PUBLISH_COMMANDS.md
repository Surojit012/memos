# Publish Commands

## PyPI (memos-ai)
```bash
python3 -m build
twine check dist/*
twine upload dist/*
```

## NPM (memos-sdk)
```bash
npm run build
npm pack
npm publish --access public
```
