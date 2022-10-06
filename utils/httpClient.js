const axios = require('axios');

exports.client = (opts) => {
    const instance = axios.create();

    instance.interceptors.request.use(request => {
        console.log(request)
        return request
    }, error => { console.log(error.message) })
    // const a = axios({...opts})
    return instance.request(opts);
};


// class HttpClient {

//     constructor(opts) {
//         // console.log(opts)
//         // this.opts = {...opts};
//     }

//     async sendRequest(opts) {
//         try {
//             // console.log({...opts})
//             const instance = axios.create({...opts});
//             // instance.interceptors.request.use( function (config) {
//             //     console.log(1)
//             //     return config;
//             // },  function (error) {
//             //     console.log(2)
//             //     return Promise.reject(error);
//             // });
//             // console.log(instance)
//             return await instance;

//         } catch(error) {
//             // console.log(666, error.message)
//             // console.log(1)

//         }
    

//     }
// }

// export default Client;