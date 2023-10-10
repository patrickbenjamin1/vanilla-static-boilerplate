# HTML Templating

A custom templating solution, based loosely on the syntax of JSX

Essentially allows you to run HTML templating in the same way you would with a template string, with the syntax slightly adjusted (partly, honestly, to allow better text editor support)

Anything given to the context argument (the second argument of Templater.run) is available globally to anything in the template.

_index.pchtml:_

```jsx
<div>
  <h1>{title}</h1>

  {things.map((thing) => <p>{thing}</p>).join('\n')}

  <p>{myCoolHelper('foo bar')}</p>
</div>
```

_execute:_

```ts
const page = fs.loadFileSync('index.pchtml').toString()
Templater.run(page, { title: 'hello world', things: ['foo', 'bar'], myCoolHelper: (input) => input.split(' ')[0] })
```

_output:_

```html
<div>
  <h1>hello world</h1>

  <p>foo</p>
  <p>bar</p>

  <p>foo</p>
</div>
```

## Partials

This custom templater supports partials in a given syntax.

For partials, the templater is run again but any attribute passed to the partial gets given to the partials template as context

_index.pchtml_

```jsx
<div>
  <_myCoolPartial className="my-cool-class">hello</_myCoolPartial>
</div>
```

_myCoolPartial.pchtml_

```jsx
<div class="{className}">{content}</div>
```

_execute_

```ts
const page = fs.loadFileSync('index.pchtml').toString()
const partial = fs.loadFileSync('myCoolPartial.pchtml').toString()
Templater.run(
  page,
  {
    title: 'hello world',
    things: ['foo', 'bar'],
    myCoolHelper: (input) => input.split(' ')[0],
  },
  {
    myCoolPartial: partial,
  }
)
```

_output_

```html
<div>
  <div class="my-cool-class">hello</div>
</div>
```

# In Pratice

In this repo, Templater is not called directly, instead `Build.run` receives a function called registerPages that configures the Templater under the hood

```ts
const registerPages: Build.BuildConfig['registerPages'] = async (registerPage) => {
  registerPage({
    template: path.resolve(BuildPaths.viewsDirectory, 'index.pchtml'),
    templateContext: { content: { title: 'home' } },
    outputPath: Paths.index,
  })
}

const build = async () => {
  await Build.run({
    registerPages,
    globalTemplateContext: { Paths },
    // .....
  })
}

build()
```

It also receives a `partialsDirectory` which automatically reads any partial in there and adds them to the third argument

# How it Works

Under the hood, all these files are turned into JS template strings (i.e. `<p>{name}</p>` is turned into `` `<p>${name}</p>\` ``) and run with a given context

Anything in braces is then run as if it was normal js (i.e. `<div>{things.map(thing => <p>{thing.name}</p>).join('')</div>}`), meaning you can use your context (or any globals) exactly as you would in real javascript.

All logic for templating is found in `/build/template.ts`.

Due to it's similarity in syntax to JSX, I recommend setting VSCode (or whatever IDE you're on) to treat pchtml files as JSX files - but there are some limitations:

- JSX requires a single root html element, whereas this doesn't by design
- attributes need to be wrapped in quotes, with braces inside - i.e. `<div className={className} />` in JSX would be `<div className="{className}" />` in PCHTML
- arrays need to be joined as their return is evaluated as strings
