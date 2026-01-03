LATEXMK = latexmk
TEXSRC = full_stack_ai.tex
OUTDIR = build
LATEXMK_OPTS = -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=$(OUTDIR)

pdf: $(OUTDIR)/full_stack_ai.pdf

$(OUTDIR)/full_stack_ai.pdf: $(TEXSRC)
	$(LATEXMK) $(LATEXMK_OPTS) $(TEXSRC)

watch:
	$(LATEXMK) $(LATEXMK_OPTS) -pvc $(TEXSRC)

clean:
	$(LATEXMK) -C -outdir=$(OUTDIR)
	rm -f full_stack_ai.pdf

.PHONY: pdf watch clean

