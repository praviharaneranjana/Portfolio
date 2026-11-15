# CV source

`cv.html` is the source for `public/resume/Pravihara_Abegunasekara.pdf`. Edit the HTML, then regenerate the PDF with headless Chrome (use an absolute output path — Chrome ignores relative ones):

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="D:/My sites/Portfolio/Portfolio/public/resume/Pravihara_Abegunasekara.pdf" \
  "file:///D:/My%20sites/Portfolio/Portfolio/resume/cv.html"
```

Keep it in step with `src/content/*.ts` — the site and the CV should state the same facts.
