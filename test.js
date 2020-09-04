const QiniuManager = require('./src/utils/QiniuManager')
const path = require('path')

const accessKey = 'KplOmrS4BRf2RinH2Nr6DBI1oCKCoLZ6EFVKj_S9'
const secretKey = '6gaNBspJMIoDWpIPEN3OcowXohx8do1OOnmVINVf'
const bucket = 'junior-markdown'

const qiniu = new QiniuManager(accessKey, secretKey, bucket)

// try {
//   qiniu.uploadFile('test1.md', '/Users/junlu/Public/cloud-doc/test1.md')
//   .then(res => {
//     console.log(333,res)
//   })
//   .catch(err => {
//     console.log(222,err)
//   })
// } catch (error) {
//   console.log('-----', error)
// }

// qiniu.generateDownloadLink('name.md')
//   .then(res => {
//     console.log(res)
//   })

// qiniu.downloadFile('test1.md', path.resolve(__dirname, 'test1.md'))
//   .then(() => {
//     console.log('success')
//   })
//   .catch(err => {
//     console.log(err)
//   })
const f = async () => {
  console.log(111)
  const a = await 100
  console.log(a)
}
f()
console.log(222)