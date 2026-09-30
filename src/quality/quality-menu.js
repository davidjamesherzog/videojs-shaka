import videojs from 'video.js';

const VjsMenu = videojs.getComponent('Menu');

class QualityMenu extends VjsMenu {

  constructor(player, options) {
    super(player, options);

    const me = this;

    player.tech_.on('shakaaudiotrackchange', function(event, {language}) {
      me.children().forEach(menuItem => {
        if (menuItem.options_.label === 'auto') {
          menuItem.selected(true);
          menuItem.show();
        } else if (menuItem.options_.language === language) {
          menuItem.selected(false);
          menuItem.show();
        } else {
          menuItem.selected(false);
          menuItem.hide();
        }
      });
    });

    player.on('qualitytrackchange', function() {
      me.hide();
    });
  }

  addItem(component) {
    super.addItem(component);

    component.on(['tap', 'click'], () => {
      const children = this.children();

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (component !== child) {
          child.selected(false);
        }
      }

    });
  }

}

export default QualityMenu;
