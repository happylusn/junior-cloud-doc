const { remote, ipcRenderer } = require('electron')
const Store = require('electron-store')
const settingsStore = new Store({name: 'Settings'})
const qiniuConfigArr = ['#savedFileLocation','#accessKey', '#secretKey', '#bucketName']

const $ = (selector) => {
  const ele = document.querySelectorAll(selector)
  return ele.length > 1 ? ele : ele[0]
}

document.addEventListener('DOMContentLoaded', () => {
  // let saveLocation = settingsStore.get('savedFileLocation')
  // if (saveLocation) {
  //   $('#savedFileLocation').value = saveLocation
  // }
  qiniuConfigArr.forEach(selector => {
    const savedValue = settingsStore.get(selector.substr(1))
    if (savedValue) {
      $(selector).value = savedValue
    }
  })
  $('#select-new-location').addEventListener('click', () => {
    remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: '选择文件存储路径'
    }).then(result => {
      if (!result.canceled) {
        $('#savedFileLocation').value = result.filePaths[0]
      }
    })
  })

  $('#settings-form').onsubmit = () => {
    // settingsStore.set('savedFileLocation', $('#savedFileLocation').value)
    qiniuConfigArr.forEach(selector => {
      if ($(selector)) {
        let { id, value } = $(selector)
        settingsStore.set(id, value ? value : '')
      }
    })
    ipcRenderer.send('config-is-saved')
    remote.getCurrentWindow().close()
    return false
  }

  $('.nav-tabs').addEventListener('click', e => {
    e.preventDefault()
    $('.nav-link').forEach(el => {
      el.classList.remove('active')
    })
    e.target.classList.add('active')
    $('.config-area').forEach(element => {
      element.style.display = 'none'
    })
    $(e.target.dataset.tab).style.display = 'block'
  })
})
