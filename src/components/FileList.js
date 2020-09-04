import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import useKeyPress from '../hooks/useKeyPress'
import useContextMenu from '../hooks/useContextMenu'
import useDebounce from '../hooks/useDebounce'
import { getParentNode } from '../utils/helper'
import './FileList.scss'

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  const [editStatus, setEditStatus] = useState(false)
  const [value, setValue] = useState('')
  const [fileTitleError, setFileTitleError] = useState(false)
  const inputEle = useRef(null)
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  const debouncedValue = useDebounce(value, 300)
  const fileInputGroupClass = classNames('col-10 file-input-group p-0', {
    'file-title-error': fileTitleError
  })

  const closeSearch = (editFile) => {
    setEditStatus(false)
    setValue('')
    if (editFile.isNew) {
      onFileDelete(editFile.id)
    }
  }
  useEffect(() => {
    if (debouncedValue !== '') {
      // 检查文件名是否已存在 
      const exist = files.find(file => file.title === debouncedValue && file.id !== editStatus)
      if (exist) {
        setFileTitleError(true)
      } else {
        setFileTitleError(false)
      }
    }
  }, [debouncedValue]) // eslint-disable-line
  const inputChange = (e) => {
    const value = e.target.value.trim()
    setValue(value)
  }
  const clickedItem = useContextMenu([
    {
      label: '打开',
      accelerator: 'Cmd+A',
      click: (i, f) => {
        console.log(i, f)
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          onFileClick(parentElement.dataset.id)
        }
      }
    },
    {
      label: '重命名',
      accelerator: 'Enter',
      click: () => {
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          const { id, title } = parentElement.dataset
          setEditStatus(id)
          setValue(title)
        }
      }
    },
    {
      label: '删除',
      accelerator: 'Cmd+Backspace',
      click: () => {
        const parentElement = getParentNode(clickedItem.current, 'file-item')
        if (parentElement) {
          onFileDelete(parentElement.dataset.id)
        }
      }
    },
  ], '.file-item', [files])
  useEffect(() => { // eslint-disable-line
    const editFile = files.find(file => file.id === editStatus)
    if (enterPressed && editStatus && value.trim() !== '' && document.activeElement === inputEle.current && !fileTitleError) {
      onSaveEdit(editStatus, value, editFile.isNew)
      setEditStatus(false)
      setValue('')
    }
    if (escPressed && editStatus && document.activeElement === inputEle.current) {
      closeSearch(editFile)
    }
  })
  useEffect(() => {
    const newFile = files.find(file => file.isNew)
    if (newFile) {
      setEditStatus(newFile.id)
      setValue(newFile.title)
    }
  }, [files])
  useEffect(() => {
    if (editStatus) {
      inputEle.current.focus()
    }
  }, [editStatus])
  return (
    <ul className="list-group list-group-flush file-list">
      {
        files.map(file => (
          <li
            className="list-group-item bg-light row flex-nowrap d-flex align-items-center file-item mx-0"
            key={file.id}
            data-id={file.id}
            data-title={file.title}
          >
            {(file.id !== editStatus && !file.isNew) &&
              <>
                <span className="col-2">
                  <FontAwesomeIcon
                    size="lg"
                    icon={faMarkdown} 
                  />
                </span>
                <span 
                  className="col-10 c-link file-title"
                  onClick={() => onFileClick(file.id)}
                >
                  {file.title}
                </span>
              </>
            }
            {(file.id === editStatus || file.isNew) && 
              <>
                <div className={fileInputGroupClass}>
                  <input
                    className="form-control file-title-input"
                    value={value}
                    onChange={inputChange}
                    placeholder="请输入文件名"
                    ref={inputEle}
                  />
                  <div className="alert alert-danger file-alert" role="alert">
                    {`A file ${value}.md already exists at this location. Please choose a different name.`}
                  </div>
                </div>
                <span
                  type="button"
                  className="icon-button col-2"
                  onClick={() => closeSearch(file)}
                >
                  <FontAwesomeIcon
                    title="关闭"
                    icon={faTimes} 
                  />
                </span>
              </>
            }
          </li>
        ))
      }
    </ul>
  )
}
FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func,
}
export default FileList
