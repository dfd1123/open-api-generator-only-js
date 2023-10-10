type Type = 'object' | 'array' | 'string' | 'number' | 'boolean';

export type ApiType = 'oAuth' | 'member';
export type Mode = 'development' | 'stage' | 'production';
export type Args = {
  mode: Mode;
  type: ApiType[];
};

export type DtoItemsSchema = DtoSchema | { uniqueItems?: boolean };

export interface DtoSchema {
  type?: Type;
  format?: string;
  enum?: string[];
  $ref?: string;
  oneOf?: DtoSchema[];
  items?: DtoItemsSchema;
}

export interface DtoComponent {
  required: string[];
  type: Type;
  typeName?: string;
  properties?: {
    [key: string]: DtoSchema;
  } | {type: DtoSchema};
  allOf?: [
    { $ref: string },
    {
      properties?: {
        [key: string]: DtoSchema;
      };
    }
  ]
}

export interface ApiProperty {
  in: 'query' | 'path';
  name: string;
  required: boolean;
  schema: DtoSchema;
}

export interface ApiSignature {
  [method: 'get' | 'post' | 'put']: {
    operationId: string;
    requestBody: {
      content: {
        'application/json': {
          schema: DtoSchema
        }
      },
      required: boolean
    };
    parameters: ApiProperty[];
    responses: {
      200: {
        content: {
          '*/*': {
            schema: DtoSchema,
          },
        },
      }
    },
    summary: string;
  };
}
