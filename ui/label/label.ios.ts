import * as common from './label-common';
import { Observable, PropertyChangeData } from 'data/observable';
import { PropertyChangeData as ViewPropertyChangeData } from 'ui/core/dependency-observable';
import { Font } from 'ui/styling/font';
import * as utils from 'utils/utils';

import { FontScaleObservable } from '../../utils/FontScaleObservable';

function tnsLabelToUILabel(view: any): UILabel {
  return <UILabel>view._nativeView;
}

import { setNativeValueFn, writeTrace } from '../../utils/helpers';

// Define the android specific properties with a noop function
for (const propertyName of common.androidProperties) {
  setNativeValueFn(common.Label, propertyName);
}

setNativeValueFn(common.Label, 'accessibilityAdjustFontSize', function onAccessiblityAdjustFontSize(data: ViewPropertyChangeData) {
  const tnsLabel = <common.Label>data.object;
  const uiLabel = tnsLabelToUILabel(tnsLabel);
  const value = !!data.newValue;

  const fontScaleProp = '_a11yFontScaleObservable';

  if (fontScaleProp in tnsLabel) {
    if (value) {
      writeTrace(`Label<ios>.accessibilityAdjustFontSize - already have a FontScaleObservable, don't enable it twice`);
      return;
    }

    writeTrace(`Label<ios>.accessibilityAdjustFontSize - disable and remove FontScaleObservable`);

    tnsLabel[fontScaleProp].off(Observable.propertyChangeEvent);
    delete tnsLabel[fontScaleProp];
    return;
  }

  let timer: any;
  const updateFontSize = () => {
    clearTimeout(timer);

    writeTrace(`Label<ios>.accessibilityAdjustFontSize - updateFontSize - set timer`);

    timer = setTimeout(() => {
      if (!tnsLabel[fontScaleProp]) {
        return;
      }

      const oldFont = <Font>tnsLabel.style.get('_fontInternal');
      const fontScale = tnsLabel[fontScaleProp].get(FontScaleObservable.FONT_SCALE);
      if (!fontScale) {
        writeTrace(`Label<ios>.accessibilityAdjustFontSize - updateFontSize - timer -> no fontScale`);
        return;
      }

      const newFontSize = oldFont.fontSize * fontScale;
      writeTrace(`Label<ios>.accessibilityAdjustFontSize - updateFontSize - timer -> update fontScale: ${JSON.stringify({
        fontScale,
        newFontSize,
        oldFontSize: oldFont.fontSize,
      })}`);

      const oldUIFont = (<any>oldFont)._uiFont || UIFont.systemFontOfSize(utils.ios.getter(UIFont, UIFont.labelFontSize));

      const newFont = new Font(oldFont.fontFamily, newFontSize, oldFont.fontStyle, oldFont.fontWeight);

      uiLabel.font = newFont.getUIFont(oldUIFont);
      tnsLabel.requestLayout();
    }, 5);
  };

  const styleCb = (args: PropertyChangeData) => {
    if (!tnsLabel.accessibilityAdjustFontSize) {
      tnsLabel.style.off(Observable.propertyChangeEvent, styleCb);

      writeTrace(`Label<ios>.accessibilityAdjustFontSize - styleCb -> tnsLabel.accessibilityAdjustFontSize have been disabled unsub`);
      return;
    }

    writeTrace(`Label<ios>.accessibilityAdjustFontSize - styleCb -> call: updateFontSize()`);
    updateFontSize();
  };

  tnsLabel.style.on(Observable.propertyChangeEvent, styleCb);

  tnsLabel[fontScaleProp] = new FontScaleObservable();

  tnsLabel[fontScaleProp].on(Observable.propertyChangeEvent, (args: PropertyChangeData) => {
    if (args.propertyName === FontScaleObservable.FONT_SCALE) {
      updateFontSize();
    }
  });

  tnsLabel.on('unloaded', () => {
    tnsLabel[fontScaleProp].off(Observable.propertyChangeEvent);
    delete tnsLabel[fontScaleProp];
  });

  writeTrace(`Label<ios>.accessibilityAdjustFontSize - set initial scale -> call: updateFontSize()`);
  updateFontSize();
});