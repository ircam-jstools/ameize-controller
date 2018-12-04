# `ameize-controller`

> Electron application dedicated to the management and rapid prototyping of 
> web-based embedded and distributed audio applications.
> 
> cf. [https://github.com/ircam-jstools/ameize-client](https://github.com/ircam-jstools/ameize-client)

On MacOS, you should disable the firewall, to prevent leak of UDP socket (that prevent re-connection).

#### Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build

# run unit & end-to-end tests
npm test

# lint all JS/Vue component files in `src/`
npm run lint
```

## NOTES

- reusing store between several windows: [https://github.com/vuejs/vuex/issues/92](https://github.com/vuejs/vuex/issues/92)
- get file full path: [https://github.com/electron/electron/blob/v1.2.8/docs/api/file-object.md](https://github.com/electron/electron/blob/v1.2.8/docs/api/file-object.md)



