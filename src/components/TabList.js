import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './TabList.scss'

const TabList = ({ files, activeId, unsaveIds, onTabClick, onCloseTab }) => {
  return (
    <ul className="nav nav-pills tablist">
      {
        files.map(file => {
          const withUnsaveMark = unsaveIds.includes(file.id)
          const fclassName = classNames('nav-link', {
            'active': file.id === activeId,
            'with-unsaved': withUnsaveMark
          }) 
          return (
            <li className="nav-item" key={file.id}>
              <a
                className={fclassName}
                href="#"
                onClick={e => {e.preventDefault(); onTabClick(file.id);}}
              >
                {file.title}
                <span
                  className="ml-2 close-icon"
                  onClick={e => {e.stopPropagation(); onCloseTab(file.id);}}
                >
                  <FontAwesomeIcon
                    icon={faTimes}
                  />
                </span>
                {withUnsaveMark &&
                  <span className="rounded-circle ml-2 unsaved-icon"></span>
                }
              </a>
            </li>
          )
        })
      }
    </ul>
  )
}
TabList.propTypes = {
  files: PropTypes.array,
  activeId: PropTypes.string,
  unsaveIds: PropTypes.array,
  onTabClick: PropTypes.func,
  onCloseTab: PropTypes.func,
}
TabList.defaultProps = {
  unsaveIds: []
}
export default TabList
