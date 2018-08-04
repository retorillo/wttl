browserify=node node_modules\browserify\bin\cmd.js
pug=node node_modules\pug-cli
less=node node_modules\less\bin\lessc
uglifyjs=node node_modules\uglify-js-es6\bin\uglifyjs
uglifycss=node node_modules\uglifycss\uglifycss

product: index.html dist/index.min.js dist/index.min.css
dev: index.html dist/index.js dist/index.css

index.html: src/index.pug
	$(pug) -o . $<
dist/index.js: src/index.js
	$(browserify) $< -o $@
dist/index.min.js: dist/index.js
	$(uglifyjs) $< -o $@ -c
dist/index.css: src/index.less
	$(less) --strict-imports $< $@
dist/index.min.css: dist/index.css
	$(uglifycss) --output $@ $<
