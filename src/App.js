import React, { useState } from 'react'
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import SimpleMDE from 'react-simplemde-editor'
import uuidv4 from 'uuid/dist/v4'
import 'easymde/dist/easymde.min.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import fileHelper from './utils/fileHelper'
import { flattenArr, objToArr, timestampToString } from './utils/helper'
import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import BottomBtn from './components/BottomBtn'
import TabList from './components/TabList'
import useIpcRenderer from './hooks/useIpcRenderer'
import Loader from './components/Loader'

const { join, basename, extname, dirname } = window.require('path')
const { remote, ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const fileStore = new Store({'name': 'Files Data'})
const settingsStore = new Store({name: 'Settings'})
const getAutoSync = () => ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))
const saveFilesToStore = (files) => {
  // we don't have to store any info in file system, eg: isNew, body ,etc
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updatedAt
    }
    return result
  }, {})
  fileStore.set('files', filesStoreObj)
}
console.log(remote.app.getName())
// saveFilesToStore({})
function App() {
  const [files, setFiles] = useState(fileStore.get('files') || {})
  const [activeFileID, setActiveFileID] = useState('')
  const [openedFileIDs, setOpendFilesIDs] = useState([])
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([])
  const [searchedFiles, setSearchedFiles] = useState([])
  const [newBtnDisabled, setNewBtnDisabled] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [ isLoading, setLoading ] = useState(false)
  const filesArr = objToArr(files)
  const openedFiles = openedFileIDs.map(openID => {
    return files[openID]
  })
  const activeFile = files[activeFileID]
  const fileList = searchedFiles.length > 0 ? searchedFiles : filesArr
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents')
  
  const fileClick = (fileID) => {
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    const { id, title, path, isLoaded } = currentFile
    if (!isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
      } else {
        fileHelper.readFile(currentFile.path).then(value => {
          const newFile = {...currentFile, body: value, isLoaded: true}
          setFiles({...files, [fileID]: newFile})
        })
      }
    }
    if (!openedFileIDs.includes(fileID)) {
      setOpendFilesIDs([ ...openedFileIDs, fileID ])
    }
  }
  const tabClick = (fileID) => {
    setActiveFileID(fileID)
  }
  const closeTab = (fileID) => {
    const tabsWithout = openedFileIDs.filter(id => id !== fileID)
    setOpendFilesIDs(tabsWithout)
    if (tabsWithout.length > 0) {
      setActiveFileID(tabsWithout[0])
    } else {
      setActiveFileID('')
    }
  }
  const fileChange = (id, value) => {
    if (value !== files[id].body) {
      const newFile = {...files[id], body: value}
      setFiles({...files, [id]: newFile})
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id])
      }
    }
  }
  const updateFileName = (id, title, isNew) => {
    const newPath = isNew ? join(savedLocation, `${title}.md`)
    : join(dirname(files[id].path), `${title}.md`)
    const modifiedFile = {...files[id], title, isNew: false, path: newPath}
    const newFiles = {...files, [id]: modifiedFile}
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles)
        setNewBtnDisabled(false)
        saveFilesToStore(newFiles)
      })
    } else {
      const oldPath = files[id].path
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }
  }
  const deleteFile = (id) => {
    if (files[id].isNew) {
      const { [id]: value, ...afterDelete } = files
      setFiles(afterDelete)
      setNewBtnDisabled(false)
    } else {
      fileHelper.deleteFile(files[id].path).then(() => {
        const { [id]: value, ...afterDelete } = files
        setFiles(afterDelete)
        saveFilesToStore(afterDelete)
        closeTab(id)
      })
    }
  }
  const fileSearch = (keyword) => {
    // filter out the new files based on the keyword
    const newFiles = filesArr.filter(file => file.title.includes(keyword))
    setSearchedFiles(newFiles)
  }
  const createNewFile = () => {
    const newID = uuidv4()
    const newFile = {
      id: newID,
      title: '',
      body: '##',
      createdAt: new Date().getTime(),
      isNew: true
    }
    setFiles({...files, [newID]: newFile})
    setNewBtnDisabled(true)
  }
  const importFiles = () => {
    remote.dialog.showOpenDialog({
      title: '选择导入的 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {name: 'Markdown files', extensions: ['md']}
      ]
    }).then(result => {
      if (!result.canceled) {
        const filteredPaths = result.filePaths.filter(path => {
          const alreadyAdded = Object.values(files).find(file => {
            return file.path === path
          })
          return !alreadyAdded
        })
        const importFilesArr = filteredPaths.map(path => {
          return {
            id: uuidv4(),
            title: basename(path, extname(path)),
            path
          }
        })
        if (importFilesArr.length > 0) {
          const newFiles = { ...files, ...flattenArr(importFilesArr)}
          setFiles(newFiles)
          saveFilesToStore(newFiles)
          remote.dialog.showMessageBox({
            type: 'info',
            title: '导入文件通知',
            message: `成功导入了${importFilesArr.length}个文件`,
          })
        }
      }
    })
  }
  const saveCurrentFile = () => {
    if (activeFile) {
      const { path, body, title } = activeFile
      fileHelper.writeFile(path, body).then(() => {
        setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id))
        if (getAutoSync()) {
          ipcRenderer.send('upload-file', {key: `${title}.md`, path})
        }
      })
    }
  }
  const activeFileUploaded = () => {
    const { id } = activeFile
    const modifiedFile = { ...files[id], isSynced: true, updatedAt: new Date().getTime() }
    const newFiles = { ...files, [id]: modifiedFile }
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id]
    const { id, path } = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true, updatedAt: new Date().getTime() }
      } else {
        newFile = { ...files[id], body: value, isLoaded: true}
      }
      const newFiles = { ...files, [id]: newFile }
      setFiles(newFiles)
      saveFilesToStore(newFiles)
    })
  }
  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      const currentTime = new Date().getTime()
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime,
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  useIpcRenderer({
    'create-new-file': createNewFile,
    'save-edit-file': saveCurrentFile,
    'import-file': importFiles,
    'active-file-uploaded': activeFileUploaded,
    'file-downloaded': activeFileDownloaded,
    'sync-loading': (message, status) => { setSyncLoading(status) },
    'loading-status': (message, status) => { setLoading(status) },
    'files-uploaded': filesUploaded
  })
  return (
    <div className="App container-fluid px-0">
      { isLoading && 
        <Loader />
      }
      <div className="row no-gutters">
        <div className="col-3 bg-light left-panel">
          <FileSearch
            title="我的云文档"
            onFileSearch={fileSearch}
          />
          <FileList
            files={fileList}
            onFileClick={fileClick}
            onSaveEdit={updateFileName} 
            onFileDelete={deleteFile}
          />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
                disabled={newBtnDisabled}
              />
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
                onBtnClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {!activeFile &&
            <div className="start-page">
              选择或创建新的 Markdown 文档
            </div>
          }
          {activeFile &&
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={closeTab}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                onChange={value => fileChange(activeFileID, value )}
                options={{
                  minHeight: 'calc(100vh - 150px)',
                  maxHeight: 'calc(100vh - 150px)'
                }}
              />
              <div className="sync-status">
                { syncLoading && 
                  <div className="spinner-border text-primary spinner-border-sm" role="status" style={{marginRight: 5}}>
                    <span className="sr-only">syncing...</span>
                  </div>
                }
                { activeFile.isSynced && 
                  <span>
                    {!syncLoading && '已同步，'}上次同步{timestampToString(activeFile.updatedAt)}
                  </span>
                }
              </div>
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
