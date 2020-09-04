import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import useKeyPress from '../hooks/useKeyPress'
import useIpcRenderer from '../hooks/useIpcRenderer'

const FileSearch = ({title, onFileSearch}) => {
  const [inputActive, setInputActive] = useState(false)
  const [value, setValue] = useState('')
  const inputEle = useRef(null)
  const enterPressed = useKeyPress(13)
  const escPressed = useKeyPress(27)
  
  const startSearch = () => {
    setInputActive(true)
  }
  const closeSearch = () => {
    setInputActive(false)
    setValue('')
    onFileSearch('')
  }
  useIpcRenderer({
    'search-file': startSearch
  })
  useEffect(() => {
    if (inputActive) {
      inputEle.current.focus()
    }
  }, [inputActive])
  useEffect(() => {
    if (enterPressed && inputActive && document.activeElement === inputEle.current) {
      onFileSearch(value)
    }
    if (escPressed && inputActive && document.activeElement === inputEle.current) {
      closeSearch()
    }
  })
  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0 no-border-radius filesearch-box">
      {!inputActive &&
        <>
          <span>{title}</span>
          <span
            type="button"
            className="icon-button"
            onClick={startSearch}
          >
            <FontAwesomeIcon
              title="搜索"
              size="lg"
              icon={faSearch} 
            />
          </span>
        </>
      }
      {inputActive &&
        <>
          <input
            className="form-control search-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            ref={inputEle}
          />
          <span
            type="button"
            className="icon-button"
            onClick={closeSearch}
          >
            <FontAwesomeIcon
              title="关闭"
              size="lg"
              icon={faTimes} 
            />
          </span>
        </>
      }
    </div>
  )
}
FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired
}
FileSearch.defaultProps = {
  title: '我的云文档'
}
export default FileSearch
