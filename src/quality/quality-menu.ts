import videojs from 'video.js';

const VjsMenu = videojs.getComponent('Menu') as any;

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
  constructor(player: any, options: unknown) {
    super(player, options);

    this.on(player, 'qualitytrackchange', () => this.hide());
  }

  /**
   * Add a menu item and make the items behave like radio buttons.
   *
   * @param {MenuItem} component
   *        The item to add.
   */
  addItem(component: any) {
    super.addItem(component);

    component.on(['tap', 'click'], () => {
      this.children().forEach((child: any) => {
        if (child !== component) {
          child.selected(false);
        }
      });
    });
  }

}

export default QualityMenu;
