const { app, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const AppWindow = require('./src/AppWindow')
const menuTemplate = require('./src/menuTemplate')
const Store = require('electron-store')
const QiniuManager = require('./src/utils/QiniuManager')
const settingsStore = new Store({ name: 'Settings'})
const fileStore = new Store({name: 'Files Data'})
const isDev = require('electron-is-dev')
const { autoUpdater } = require('electron-updater')
const { setImmediate } = require('timers')
let mainWindow, settingsWindow

const createManager = () => {
  const accessKey = settingsStore.get('accessKey')
  const secretKey = settingsStore.get('secretKey')
  const bucketName = settingsStore.get('bucketName')
  return new QiniuManager(accessKey, secretKey, bucketName)
}
app.on('ready', () => {
  autoUpdater.autoDownload = false
  if (isDev) {
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
    autoUpdater.checkForUpdates()
  } else {
    autoUpdater.checkForUpdatesAndNotify()
  }
  autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Error:', error == null ? 'unknown' : error.message)
  })
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
  })
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '应用有新版本',
      message: '发现新版本，是否现在更新？',
      buttons: ['是', '否']
    }).then(buttonIndex => {
      if (buttonIndex === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  autoUpdater.on('download-progress', (progress, bytesPerSecond, percent, total, transferred) => {
    console.log(progress, bytesPerSecond, percent, total, transferred)
  })
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      title: '安装更新',
      message: '更新下载完毕，应用将重启并进行安装'
    }).then(() => {
      setImmediate(() => autoUpdater.quitAndInstall())
    })
  })
  autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
      title: '没有新版本',
      message: '当前已是最新版本'
    })
  })
  const mainWindowConfig = {
    width: 1024,
    height: 680
  }
  // console.log(isDev)
  const urlLocation = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, './index.html')}`
  mainWindow = new AppWindow(mainWindowConfig, urlLocation)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // set the menu
  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  ipcMain.on('open-settings-window', () => {
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow  
    }
    const settingsFileLocation = `file://${path.resolve(__dirname, '../settings/settings.html')}`
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    settingsWindow.removeMenu()
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })
  ipcMain.on('upload-file', (event, data) => {
    const manager = createManager()
    mainWindow.webContents.send('sync-loading', true)
    manager.uploadFile(data.key, data.path).then(data => {
      console.log('上传成功', data)
      mainWindow.webContents.send('active-file-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    }).finally(() => {
      mainWindow.webContents.send('sync-loading', false)
    })
  })
  ipcMain.on('download-file', (event, data) => {
    const manager = createManager()
    const filesObj = fileStore.get('files')
    const { key, path, id } = data
    mainWindow.webContents.send('sync-loading', true)
    manager.getStat(data.key).then((resp) => {
      const serverUpdatedTime = Math.round(resp.putTime / 10000)
      const localUpdatedTime = filesObj[id].updatedAt
      if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
        manager.downloadFile(key, path).then(() => {
          mainWindow.webContents.send('file-downloaded', {status: 'download-success', id})
        })
      } else {
        mainWindow.webContents.send('file-downloaded', {status: 'no-new-file', id})
      }
    }, (error) => {
      if (error.statusCode === 612) {
        mainWindow.webContents.send('file-downloaded', {status: 'no-file', id})
      }
    }).finally(() => {
      mainWindow.webContents.send('sync-loading', false)
    })
  })
  ipcMain.on('upload-all-to-qiniu', () => {
    mainWindow.webContents.send('loading-status', true)
    const manager = createManager()
    const filesObj = fileStore.get('files') || {}
    const uploadPromiseArr = Object.keys(filesObj).map(key => {
      const file = filesObj[key]
      return manager.uploadFile(`${file.title}.md`, file.path)
    })
    Promise.all(uploadPromiseArr).then(result => {
      console.log(result)
      // show uploaded message
      dialog.showMessageBox({
        type: 'info',
        title: `成功上传了${result.length}个文件`,
        message: `成功上传了${result.length}个文件`,
      })
      mainWindow.webContents.send('files-uploaded')
    }).catch(() => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    }).finally(() => {
      mainWindow.webContents.send('loading-status', false)
    })
  })
  ipcMain.on('config-is-saved', () => {
    // watch out menu items index for mac and windows
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
    const switchItems = (toggle) => {
      [1, 2, 3].forEach(number => {
        qiniuMenu.submenu.items[number].enabled = toggle
      })
    }
    const qiniuIsConfiged =  ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key))
    switchItems(!!qiniuIsConfiged)
  })
})
