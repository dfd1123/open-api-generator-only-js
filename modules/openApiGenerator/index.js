/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/naming-convention,no-underscore-dangle */
const _forEach = require('lodash/forEach');
const _each = require('lodash/each');
const _upperFirst = require('lodash/upperFirst');
const _camelCase = require('lodash/camelCase');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-dynamic-require
const generatorConfig = require(`${process.env.PWD}/apiGenerator.config.js`);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const getUrl = type => {
  const url = generatorConfig?.type?.[type] ?? '';
  if (!url) throw new Error('Api Docs Url Environment variables is required');

  return url;
};

class ApiGenerator {
  #types = [];
  #schemas = [];
  #methods = [];
  #print = '';
  #type = null;

  constructor(type) {
    this.#type = type;
  }

  generate = async () => {
    const apiDir = generatorConfig?.generateDir ?? '';
    const name = `${_upperFirst(this.#type)}Api`;
    const docs = await this.#getApiDocs();
    const generic = { name: 'Config', extends: 'AxiosRequestConfig', defaultType: 'AxiosRequestConfig' };
    this.#append('/* eslint-disable @typescript-eslint/no-empty-interface */');
    this.#append('/* eslint-disable no-multiple-empty-lines */');

    this.#appendImports([
      { name: '{ AxiosRequestConfig, AxiosInstance }', path: 'axios' },
    ]);

    _forEach(docs.components?.schemas ?? docs.definitions, this.#parseSchema);

    _forEach(docs.paths, (signature, path) => this.#parsePaths(signature, path, generic.name));
    _each(this.#types, this.#appendType);

    _each(this.#schemas, this.#appendSchema);

    this.#defineClass({
      name,
      generic: '<Config extends AxiosRequestConfig = AxiosRequestConfig, Axios extends AxiosInstance = AxiosInstance>',
      constructor: 'constructor(private readonly api: Axios) {}',
      methods: this.#getMethods(),
    });

    await fs.promises.mkdir(apiDir, { recursive: true });
    fs.promises.writeFile(`${apiDir}/${name}.ts`, this.#print, { flag: 'w' })
      .then(() => console.log(`[${name}] is built`))
      .catch(console.error);
  };

  /**
   * @returns {Promise<{ components: { schemas: {} }, paths: {} }>}
   */
  #getApiDocs = async () => {
    const url = getUrl(this.#type) || '';
    const isJson = false;
    if (!isJson) return axios.get(url).then(({ data }) => data);

    return fs.promises.readFile(path.join(process.cwd(), url), 'utf-8').then(data => JSON.parse(data));
  };

  #append = val => {
    this.#print += `${val}\n`;
  };

  /** @param {{ name: string; path: string; }[]} imports */
  #appendImports = imports => {
    imports.forEach(({ name, path }) => {
      this.#append(`import ${name} from '${path}';`);
    });
    this.#append('');
  };

  #defineClass = ({ name, generic = '', constructor, methods }) => {
    const _constructor = constructor ? `\n  ${constructor}` : '\n';
    this.#append(`\nexport default class ${name}${generic} {${_constructor}${methods}\n}`);
  };

  #getMethods = () => this.#methods.reduce((acc, method) => {
    const quote = method.hasPathVar ? '`' : '\'';
    if (!method.name) {
      const pathName = method.path.split('/').map((s, idx) => (idx > 0 ? _upperFirst(s) : s)).join('');
      method.name = `${pathName || 'root'}${_upperFirst(method.method)}`;
    }
    const methodName = _camelCase(method.name.replace(/^v\d+/, ''));
    acc += '\n';

    method.params = method.params.map(p => ({
      ...p,
      name: p.name.split('.').reduce((acc, cur) => (acc ? acc + cur[0].toUpperCase() + cur.substring(1) : cur), ''),
    }));

    if (method.summary) acc += `\n  /** ${method.summary} */`;

    // if (method.params.filter(p => p.name !== 'config?').length > 1) {
    //   const params = method.params.filter(p => p.type !== 'Config');
    //   const newParams = params.reduce((acc, cur) => {
    //     acc.type += acc.type ? ` & ${cur.type}` : cur.type;
    //     return acc;
    //   }, { name: 'params', type: '' });
    //   method.params = [newParams, { name: 'config?', type: 'Config' }];
    // }

    acc += `\n  ${methodName}(${method.params.map(p => `${p.name}: ${p.type}`).join(', ')}) {`;
    acc += `\n    return this.api.${method.method}<${method.response}>(${quote}${method.path}${quote}${method.requestParam ? `, ${method.requestParam}` : ''}${['get', 'put', 'delete'].includes(method.method) ? '' : ', config'});`;
    acc += '\n  }';

    return acc;
  }, '');

  #appendSchema = schema => {
    if (schema.key === 'Unit') return;
    this.#append('');
    this.#append(`export interface ${schema.key}${schema.ext ? ` extends ${schema.ext}` : ''} {`);

    _each(schema.props, it => this.#append(`  ${it.key}: ${it.type};`));
    this.#append('}');
  };

  #appendType = type => {
    this.#append(`export type ${type.key} = ${type.value};`);
  };

  /**
   * @param {DtoItemsSchema} p
   * @param {string} k
   */
  #getArray = (p, k) => {
    const type = this.#getType(p.items, k);
    if (p.uniqueItems) return `${type}[]`;

    return `${type}[]`;
  };

  #getEnum = (e, k, originKey) => {
    if (originKey) originKey = originKey[0].toUpperCase() + originKey.substring(1);
    let key = (originKey || '') + k[0].toUpperCase() + k.substring(1);
    key = key.replace(/[{}[\]/?.,;:|)*~`!^\-_+<>@#$%&\\=('"]/gi, '');

    if (!this.#types.some(item => item.key === key)) {
      this.#types.push({ key, value: e.map(i => `'${i}'`).join(' | ') });
    } else {
      // key 값은 같은데 value 값이 다를 시 대처를 위해 error 로그를 남김
      const isDuplicate = this.#types.some(item => item.key === key && JSON.stringify(item.value) !== JSON.stringify(e.map(i => `'${i}'`).join(' | ')));
      if (isDuplicate) console.error(`DUPLICATE KEY: ${k}`, e);
    }

    return key;
  };

  // eslint-disable-next-line @typescript-eslint/default-param-last
  #getType = (p, k = null, originKey) => {
    if (!p) return 'void';

    if (p.$ref) {
      const type = p.$ref.split('/').pop();
      return type === 'Unit' ? 'void' : _upperFirst(type.replace(/[^a-zA-Z]/g, ''));
    }
    if (p.title) return p.title.replace(/[^a-zA-Z]/g, '');
    if (p.oneOf) return `(${p.oneOf.map(this.#getType).join(' | ')})`;
    if (p.type === 'array') return this.#getArray(p, k);
    if (p.enum) return this.#getEnum(p.enum, k, originKey);
    if (p.type === 'integer') return 'number';
    if (p.type === 'object') {
      if (p.additionalProperties?.type === 'string') return 'Record<string, string>';
      if (p.additionalProperties === 'true') return 'Record<any, any>';
    }
    return p.type;
  };

  /**
   * @param {DtoComponent} schema
   * @param {string} key
   */
  #parseSchema = (schema, key) => {
    const s = { key: _upperFirst(key.replace(/[^a-zA-Z]/g, '')), props: [] };
    let properties;

    if (schema.allOf) {
      s.ext = this.#getType(schema.allOf[0]);
      properties = schema.allOf[1].properties;
    } else {
      properties = schema.properties;
    }

    _forEach(properties, (v, k) => {
      return s.props.push({ key: schema.required?.includes(k) ? k : `${k}?`, type: schema.required?.includes(k) ? this.#getType(v, k, key) : `${this.#getType(v, k, key)} | null` });
    });

    this.#schemas.push(s);
  };

  /**
   * @param {ApiProperty[]} params
   * @param {string} methodName
   */
  #parseParameters = (params, methodName) => {
    params = (params || []).filter(p => p.in !== 'header' && p.in !== 'body');
    if (params.length === 0) return [];
    params = params.map(p => ({
      ...p,
      name: p.name.split('.').reduce((acc, cur) => (acc ? acc + cur[0].toUpperCase() + cur.substring(1) : cur), ''),
    }));
    const pa = params.map(param => `${param.name}${param.required ? '' : '?'}: ${this.#getType(param.schema, param.name, methodName)}`);
    return [{ name: `{ ${params.map(it => it.name).join(', ')} }`, type: `{ ${pa.join(', ')} }${params.every(p => !p.required) ? ' = {}' : ''}`, queryParams: params.filter(it => it.in === 'query').map(it => it.name) }];
  };

  #parseName = type => {
    if (type.endsWith('[]')) return _camelCase(type.replace('[]', 'Array'));
    const match = /(\w+)<(\w+)>/.exec(type);
    if (match) return _camelCase(match[2] + match[1]);

    return _camelCase(type);
  };

  #parseRequestBody = requestBody => {
    if (!requestBody) return [];

    if (!!requestBody.content && !requestBody.content['application/json']) console.log('awdadawdawd', requestBody);

    const type = this.#getType(requestBody.content ? requestBody.content['application/json'].schema : requestBody.schema);
    return [{ name: this.#parseName(type), type }];
  };

  #parseResponse = responses => {
    const content = responses?.['200']?.content ?? responses?.['200'];
    const schema = content?.['*/*']?.schema ?? content?.['application/json']?.schema ?? content?.schema;
    if (!schema) return 'void';
    return this.#getType(schema);
  };

  /**
   * @param {ApiSignature} signature
   * @param {string} path
   * @param {string} configType
   */
  #parsePaths = (signature, path, configType) => {
    _forEach(signature, (spec, method) => {
      const params = this.#parseParameters(spec.parameters, spec.operationId);
      const pathParams = path.match(/\/{(\w+)}/);
      const requestBody = this.#parseRequestBody(spec.requestBody ?? (spec.parameters || []).find(p => p.in === 'body'));
      const queryParams = params[0]?.queryParams.length ? `{ ${params[0]?.queryParams.join(', ')} }` : requestBody[0]?.name ?? 'undefined';
      const requestParam = ['get', 'put', 'delete'].includes(method) ? `{ ...config, params: ${queryParams} }` : requestBody[0]?.name ?? queryParams ?? 'undefined';

      // eslint-disable-next-line no-template-curly-in-string
      this.#methods.push({ name: spec.operationId, hasPathVar: !!pathParams, method, params: [...params, ...requestBody, { name: 'config?', type: configType }], path: path.replace(/\/{(\w+)}/g, '/${$1}'), requestParam, response: this.#parseResponse(spec.responses), summary: spec.summary });
    });
  };
}

_each(Object.keys(generatorConfig.type), type => new ApiGenerator(type).generate());
