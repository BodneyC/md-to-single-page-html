# MD to Single Page HTML

Due to several limitations at work, I'm unable to install and use Chromium headless or PhantomJS as a dependency of another package to tranform markdown to PDFs. I've also tried Pandoc with WkHtmlToPdf and getting it to work cleanly maintaining links and adding CSS has been a pain.

Because of the above, I've started sending out reports as HTML documents but I then have to manually add images and other content - the purpose of this mini-project is to automate this.

## Usage

```txt
Markdown to Single HTML Page

    A markdown to HTML converter, using Marked, which downloads/reads
      then base64s images and adds them to the HTML directly

Usage:

    mdtohtml [-i <file>] [-o <file>] [--external] [--beautify] [-s <stylesheet>]

Options:

    -h|--help     Show this help section
    -i|--input    Input filename
    -o|--output   Output filename
    -s|--css      CSS filename or URL
    -e|--external Download external images
```
