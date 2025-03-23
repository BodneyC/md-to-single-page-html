#!/usr/bin/env node

const { JSDOM } = require('jsdom')
const request = require('sync-request')
const { red, green, yellow, blue } = require('kleur')

const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

const addHeaderAnchors = (dom) => {
  for (const header of dom.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const id = header.innerHTML.toLowerCase()
      .replace(/[?]/, '')
      .replace(/[()"']/, '')
      .replace(/[^a-z0-9]/gmi, '-')
    header.id = id
  }
}

const processImg = (dom, dir, external) => {
  for (const img of dom.window.document.querySelectorAll('img')) {
    let data = null
    let type = mime.lookup(img.src.split('.').pop())
    if (/^https?:\/\//.test(img.src)) {
      if (!external) continue
      data = request('GET', img.src).body
    } else {
      if (/^https?:\/\//.test(dir))
        data = request('GET', dir + '/' + img.src).body
      else
        data = fs.readFileSync(path.join(dir, img.src))
    }
    img.src = `data:${type};base64,` +
      Buffer.from(data, 'binary').toString('base64')
  }
}

const addStyle = (dom, css, external) => {
  let style = dom.window.document.createElement('style')
  style.type = 'text/css'
  if (/^https?:\/\//.test(css)) {
    if (external)
      style.innerHTML = request('GET', css).body.toString()
    else
      style.src = css
  } else {
    style.innerHTML = fs.readFileSync(css, 'utf8')
  }
  dom.window.document.getElementsByTagName('head')[0].appendChild(style)
}

const getInput = input => {
  if (/^https?:\/\//.test(input))
    return [request('GET', input).body.toString(), path.dirname(input)]
  return [
    fs.readFileSync(input, 'utf8'),
    path.dirname(fs.realpathSync(input))
  ]
}

const processArgs = args => {
  if (args.help) showHelp(args)
  const getRscPath = f => path.join(__dirname, 'rsc', f)
  const input = args._.length > 0 ? args._[0] : args.input
  if (!input) {
    console.error('No input provided')
    process.exit(1)
  }
  const output = (args._.length > 1 ? args._[1] : args.output)
    || (input.substr(0, input.lastIndexOf('.')) || input) + '.html'
  return {
    input,
    output,
    css: args.css || getRscPath('gh.css'),
    beautify: args.beautify,
    footer: !args['no-footer'],
    external: args.external,
  }
}

const main = args => {
  args = processArgs(args)
  let [input, dir] = getInput(args.input)
  let dom = new JSDOM(require('marked').parse(input))
  processImg(dom, dir, args.external)
  addHeaderAnchors(dom)
  addStyle(dom, args.css, args.external)
  if (args.footer) {
    let doc = dom.window.document
    doc.body.appendChild(doc.createElement('br'))
    doc.body.appendChild(doc.createElement('br'))
  }
  let out = dom.serialize()
  if (args.beautify)
    out = require('js-beautify').html(out, { indent_size: 2 })
  fs.writeFileSync(args.output, out)
}

const showHelp = () => {
  console.log(`
${green('Markdown to Single HTML Page')}

    A markdown to HTML converter, using Marked, which downloads/reads
      then base64s images and adds them to the HTML directly

${green('Usage')}:

    ${yellow('mdtohtml')} \
${blue('[')}${yellow('-i')} ${red('<')}${yellow('file')}${red('>')}${blue(']')} \
${blue('[')}${yellow('-o')} ${red('<')}${yellow('file')}${red('>')}${blue(']')} \
${blue('[')}${yellow('--external')}${blue(']')} \
${blue('[')}${yellow('--beautify')}${blue(']')} \\
      ${blue('[')}${yellow('-s')} ${red('<')}${yellow('stylesheet')}${red('>')}${blue(']')}

${green('Options')}:

    ${yellow('-h')}${blue('|')}${yellow('--help')}         Show this help section
    ${yellow('-i')}${blue('|')}${yellow('--input')}        Input filename
    ${yellow('-o')}${blue('|')}${yellow('--output')}       Output filename
    ${yellow('-s')}${blue('|')}${yellow('--css')}          CSS filename or URL
    ${yellow('-e')}${blue('|')}${yellow('--external')}     Download external images
    ${yellow('-b')}${blue('|')}${yellow('--beautify')}     Beautify the resulting HTML
    ${yellow('--nof')}${blue('|')}${yellow('--no-footer')} Do not add two ${red('<br>')}s to the bottom of the doc
  `)
  process.exit(0)
}

if (require.main === module)
  main(require('minimist')(process.argv.slice(2), {
    alias: {
      css: 's',
      help: 'h',
      input: 'i',
      output: 'o',
      external: 'e',
      beautify: 'b',
      'no-footer': 'nof',
    }
  }))

module.exports = main
