

## Open Api Generator With JS

---


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
};
```

**generateDir** specifies the directory path where the result files created when OpenApiGenerator is executed are stored.

For **Type**, if the written Swagger API document is divided by domain, write a key value to specify and specify the api-docs URL where you can view Swagger's json results as the value. (This type value is important!!)


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