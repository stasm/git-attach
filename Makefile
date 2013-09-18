all: man/git-attach.1

man/git-attach.1: man/git-attach.md
	@./node_modules/.bin/ronn --roff $< > $@
