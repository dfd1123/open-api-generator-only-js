/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable no-multiple-empty-lines */
import { AxiosRequestConfig, AxiosInstance } from 'axios';


export default class SampleApi<Config extends AxiosRequestConfig = AxiosRequestConfig, Axios extends AxiosInstance = AxiosInstance> {
  constructor(private readonly api: Axios) {}

  /** List API versions */
  listVersionsv2(config?: Config) {
    return this.api.get<void>('/', { ...config, params: undefined });
  }

  /** Show API version details */
  getVersionDetailsv2(config?: Config) {
    return this.api.get<void>('/v2', { ...config, params: undefined });
  }
}
