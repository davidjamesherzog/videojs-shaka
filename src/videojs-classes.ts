import videojs from 'video.js'
import type Html5Class from 'video.js/dist/types/tech/html5'
import type MenuClass from 'video.js/dist/types/menu/menu'
import type MenuButtonClass from 'video.js/dist/types/menu/menu-button'
import type MenuItemClass from 'video.js/dist/types/menu/menu-item'

/**
 * The video.js typings describe `getTech` as returning a tech instance
 * although it returns the class, so the classes are re-typed here once rather
 * than at every use.
 */
export const Html5 = videojs.getTech('Html5') as unknown as typeof Html5Class

export const Menu = videojs.getComponent('Menu') as typeof MenuClass
export const MenuButton = videojs.getComponent('MenuButton') as typeof MenuButtonClass
export const MenuItem = videojs.getComponent('MenuItem') as typeof MenuItemClass

export type {Html5Class, MenuClass, MenuButtonClass, MenuItemClass}
