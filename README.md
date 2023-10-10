

## Open Api Generator With JS


### How to use OpenApiGenerator developed with Vanilla JS

First, create an `apiGenerator.config.js` file in the project root directory.

And then write the settings as shown below.

```js
module.exports = {
  generateDir: 'src/api/generated',
  type: {
    basic: 'https://api-develop.granter.biz/v3/api-docs',
    // basic: proccess.env.BASIC_API_DOCS_URL,
  },
  directResponseTypes: ['basic']
};
```

**generateDir** specifies the directory path where the result files created when OpenApiGenerator is executed are stored.

For **type**, if the written Swagger API document is divided by domain, write a key value to specify and specify the api-docs URL where you can view Swagger's json results as the value. (This type value is important!!)

When using axios, **directResponseTypes** directly takes out the response.data value, not the response type, and when you want to define the type of the return value, you put the key value of the type (basic is the key value in the example above) as an array in directResponseTypes.
If directResponseTypes is not defined, the default value [] is automatically set.


Now add the script to package.json as shown below.

```json
"scripts": {
    ...
    "generate-api": "node src/modules/openApiGenerator"
  },
```



***Now you are ready to use OpenApiGenerator!!!***


---

### How to run?


First:

```bash
npm run install
# or
yarn install
```


Second:

```bash
npm run generate-api
# or
yarn generate-api
```

---

### Caution

If you use prettier or eslint, be sure to exclude the directory where the generated result file is created from prettier and eslint.


---

### Original author for this development source



https://github.com/oxizen