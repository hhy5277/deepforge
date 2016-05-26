/*globals define*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed May 18 2016 08:58:20 GMT-0500 (CDT).
 */

define([
    './lib/ace',
    'underscore',
    'css!./styles/TextEditorWidget.css'
], function (
    ace,
    _
) {
    'use strict';

    var TextEditorWidget,
        WIDGET_CLASS = 'text-editor';

    TextEditorWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;
        this.editor = ace.edit(this._el[0]);
        this.editor.getSession().setMode('ace/mode/lua');

        // Get the config from component settings for themes
        // TODO
        this.editor.setOptions({
            fontSize: '12pt'
        });
        this.editor.$blockScrolling = Infinity;
        this.DELAY = 250;
        // this.editor.setTheme('ace/theme/monokai');

        this.editor.on('input', _.debounce(this.saveText.bind(this), this.DELAY));
        this.currentHeader = '';
        this.activeNode = null;
        this._initialize();

        this._logger.debug('ctor finished');
    };

    TextEditorWidget.prototype._initialize = function () {
        // set widget class
        this._el.addClass(WIDGET_CLASS);
    };

    TextEditorWidget.prototype.onWidgetContainerResize = function () {
    };

    // Adding/Removing/Updating items
    TextEditorWidget.prototype.getHeader = function (desc) {
        return `-- Editing "${desc.name}"`;
    };

    TextEditorWidget.prototype.addNode = function (desc) {
        // Set the current text based on the given
        // Create the header
        var header = this.getHeader(desc) + '\n';

        this.activeNode = desc.id;
        this.editor.setValue(header + desc.text, -1);
        this.currentHeader = header;
    };

    TextEditorWidget.prototype.saveText = function () {
        var text = this.editor.getValue().replace(this.currentHeader, '');
        if (this.activeNode) {
            this.saveTextFor(this.activeNode, text);
        } else {
            this._logger.error(`Active node is invalid! (${this.activeNode})`);
        }
    };

    TextEditorWidget.prototype.removeNode = function (gmeId) {
        if (this.activeNode === gmeId) {
            this.editor.setValue('');
            this.activeNode = null;
        }
    };

    TextEditorWidget.prototype.updateNode = function (/*desc*/) {
        // TODO: Handle concurrent editing... Currently, last save wins and there are no
        // updates after opening the node. Supporting multiple users editing the same
        // operation/layer is important but more work than it is worth for now
        //var currentText = this.editor.getValue().replace(this.currentHeader, '');
        //if (this.activeNode === desc.id && desc.text !== currentText) {
            //this.addNode(desc);
        //}
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    TextEditorWidget.prototype.destroy = function () {
    };

    TextEditorWidget.prototype.onActivate = function () {
        this._logger.debug('TextEditorWidget has been activated');
    };

    TextEditorWidget.prototype.onDeactivate = function () {
        this._logger.debug('TextEditorWidget has been deactivated');
    };

    return TextEditorWidget;
});
