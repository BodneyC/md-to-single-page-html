#!/usr/bin/env node

const { JSDOM } = require('jsdom')
const request = require('sync-request')
const { red, green, yellow, blue } = require('kleur')

const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

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
    return [ request('GET', input).body.toString(), path.dirname(input) ]
  return [
    fs.readFileSync(input, 'utf8'),
    path.dirname(fs.realpathSync(input))
  ]
}

const main = args => {
  let [ input, dir ] = getInput(args.input)
  let dom = new JSDOM(require('marked')(input))
  processImg(dom, dir, args.external)
  addStyle(dom, args.css, args.external)
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

    ${yellow('-h')}${blue('|')}${yellow('--help')}     Show this help section
    ${yellow('-i')}${blue('|')}${yellow('--input')}    Input filename
    ${yellow('-o')}${blue('|')}${yellow('--output')}   Output filename
    ${yellow('-s')}${blue('|')}${yellow('--css')}      CSS filename or URL
    ${yellow('-e')}${blue('|')}${yellow('--external')} Download external images
  `)
  process.exit(0)
}

const processArgs = args => {
  if (args.help) showHelp(args)
  const getRscPath = f => path.join(__dirname, 'rsc', f)
  return {
    input:    args.input  || getRscPath('example.md'),
    output:   args.output || `${path.basename(args.input) || getRscPath('input.md')}.html`,
    css:      args.css    || getRscPath('gh.css'),
    beautify: args.beautify,
    external: args.external,
  }
}

if (require.main === module)
  main(processArgs(require('minimist')(process.argv.slice(2), {
    alias: {
      css: 's',
      help: 'h',
      input: 'i',
      output: 'o',
      external: 'e',
      beautify: 'b',
    }
  })))
