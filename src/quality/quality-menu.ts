import type Player from 'video.js/dist/types/player'
import type MenuItem from 'video.js/dist/types/menu/menu-item'
import {Menu as VjsMenu} from '../videojs-classes'
import type {QualityPickerButtonOptions} from './quality-picker-button'

/**
 * The drop-down menu of a quality picker button.
 *
 * @extends Menu
 */
class QualityMenu extends VjsMenu {
  /**
   * Create a menu.
   *
   * @param {Player} player
   *        The video.js player.
   *
   * @param {Object} options
   *        The menu button's options.
   */
  constructor(player: Player, options: QualityPickerButtonOptions) {
    super(player, options)

    const hide = () => this.hide()

    player.on('qualitytrackchange', hide)
    this.on('dispose', () => player.off('qualitytrackchange', hide))
  }

  /**
   * Add a menu item and make the items behave like radio buttons.
   *
   * @param {MenuItem} component
   *        The item to add.
   */
  addItem(component: MenuItem) {
    super.addItem(component)

    component.on(['tap', 'click'], () => {
      this.children().forEach((child) => {
        if (child !== component) {
          child.selected(false)
        }
      })
    })
  }
}

export default QualityMenu
