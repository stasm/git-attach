all: man/doc.1

man/%.1: man/%.md
	@./node_modules/.bin/ronn --roff $< > $@
