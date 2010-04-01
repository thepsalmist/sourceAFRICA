dc.ui.Toolbar = dc.View.extend({

  id : 'toolbar',

  callbacks : {
    '#calais_credits.click'         : '_openCalais'
  },

  constructor : function(options) {
    this.base(options);
    _.bindAll(this, '_updateSelectedDocuments', '_addProjectWithDocuments',
      '_registerDocument', '_deleteSelectedDocuments', 'editTitle', 'editSource',
      'editDescription', 'editRelatedArticle', 'display');
    this.editMenu         = this._createEditMenu();
    this.downloadMenu     = this._createDownloadMenu();
    this.manageMenu       = this._createManageMenu();
    this.connectionsMenu  = this._createConnectionsMenu();
    this.projectMenu      = new dc.ui.ProjectMenu({onClick : this._updateSelectedDocuments, onAdd : this._addProjectWithDocuments});
    Documents.bind(Documents.SELECTION_CHANGED, this.display);
  },

  render : function() {
    var el = $(this.el);
    el.html(JST.workspace_toolbar({}));
    $('.edit_menu_container', el).append(this.editMenu.render().el);
    $('.download_menu_container', el).append(this.downloadMenu.render().el);
    $('.manage_menu_container', el).append(this.manageMenu.render().el);
    $('.connections_menu_container', el).append(this.connectionsMenu.render().el);
    $('.project_menu_container', el).append(this.projectMenu.render().el);
    this.remoteUrlButton = $('#edit_remote_url_button', el);
    this.setCallbacks();
    return this;
  },

  display : function() {
    var count = $('.document.is_selected').length;
    if (count <= 0) return this.hide();
    count > 1 ? this.editMenu.disable() : this.editMenu.enable();
    this.show();
  },

  hide : function() {
    dc.ui.notifier.hide(true);
    $(this._panel()).setMode('closed', 'toolbar');
  },

  show : function() {
    if (!Projects.populated) Projects.populate();
    $(this._panel()).setMode('open', 'toolbar');
  },

  notifyProjectChange : function(projectName, numDocs, removal) {
    var prefix = removal ? 'removed ' : 'added ';
    var prep   = removal ? ' from "'  : ' to "';
    var notification = prefix + numDocs + ' ' + Inflector.pluralize('document', numDocs) + prep + projectName + '"';
    dc.ui.notifier.show({mode : 'info', text : notification, anchor : this.projectMenu.el, position : '-top right', top : -1, left : 10});
  },

  // Wrapper function for safely editing an attribute of a specific document.
  edit : function(callback) {
    if (!Documents.allowedToEditSelected()) return;
    return callback(Documents.selected()[0]);
  },

  editTitle : function() {
    this.edit(function(doc) {
      dc.ui.Dialog.prompt('Title', doc.get('title'), function(title) {
        Documents.update(doc, {title : title});
        return true;
      }, true);
    });
  },

  editSource : function() {
    this.edit(function(doc) {
      dc.ui.Dialog.prompt('Source', doc.get('source'), function(source) {
        Documents.update(doc, {source : source});
        return true;
      }, true);
    });
  },

  editDescription : function() {
    this.edit(function(doc) {
      dc.ui.Dialog.prompt('Description', doc.get('description'), function(description) {
        Documents.update(doc, {description : description});
        return true;
      });
    });
  },

  editRelatedArticle : function() {
    this.edit(function(doc) {
      dc.ui.Dialog.prompt('Related Article', doc.get('related_article'), function(rel) {
        Documents.update(doc, {related_article : rel});
        return true;
      }, true);
    });
  },

  _updateSelectedDocuments : function(project) {
    var docs = Documents.selected();
    var removal = project.containsAny(docs);
    removal ? project.removeDocuments(docs) : project.addDocuments(docs);
    this.notifyProjectChange(project.get('title'), docs.length, removal);
  },

  _addProjectWithDocuments : function(title) {
    var ids = Documents.selectedIds();
    var project = new dc.model.Project({title : title, document_ids : ids.join(',')});
    Projects.create(project, null, {error : function() { Projects.remove(project); }});
    this.notifyProjectChange(title, ids.length);
  },

  _deleteSelectedDocuments : function() {
    if (!Documents.allowedToEditSelected()) return;
    var docs = Documents.selected();
    var message = 'Really delete ' + docs.length + ' ' + Inflector.pluralize('document', docs.length) + '?';
    dc.ui.Dialog.confirm(message, _.bind(function() {
      _(docs).each(function(doc){ Documents.destroy(doc); });
      dc.app.documentCount -= docs.length;
      dc.ui.Project.uploadedDocuments.render();
      Projects.removeDocuments(docs);
      this.display();
      return true;
    }, this));
  },

  _registerDocument : function() {
    var docs = Documents.selected();
    if (docs.length > 1) return dc.ui.Dialog.alert('Please register only a single published document at a time.');
    var doc = docs[0];
    dc.ui.Dialog.prompt("Enter URL of Published Document", doc.get('remote_url'), function(revised) {
      Documents.update(doc, {remote_url : revised});
      return true;
    }, 'short');
  },

  _openTimeline : function() {
    new dc.ui.TimelineDialog(Documents.selected());
  },

  _openConnections : function(kind) {
    dc.app.visualizer.open(kind);
  },

  _openEntities : function() {
    dc.app.entities.open();
  },

  _setSelectedAccess : function(access) {
    if (!Documents.allowedToEditSelected()) return;
    var docs = Documents.selected();
    _.each(docs, function(doc) { Documents.update(doc, {access : access}); });
    var notification = 'access updated for ' + docs.length + ' ' + Inflector.pluralize('document', docs.length);
    dc.ui.notifier.show({mode : 'info', text : notification, anchor : this.manageMenu.el, position : '-top right', top : -1, left : 7});
  },

  _panel : function() {
    return this._panelEl = this._panelEl || $(this.el).parents('.panel_content')[0];
  },

  _createDownloadMenu : function() {
    return new dc.ui.Menu({
      label   : 'Download',
      items   : [
        // {title : 'Download Document Viewer', onClick : Documents.downloadSelectedViewers},
        {title : 'Download as PDF',          onClick : Documents.downloadSelectedPDF},
        {title : 'Download Full Text',       onClick : Documents.downloadSelectedFullText}
      ]
    });
  },

  _createEditMenu : function() {
    return new dc.ui.Menu({
      label   : 'Edit',
      items   : [
        {title : 'Edit Title',            onClick : this.editTitle},
        {title : 'Edit Source',           onClick : this.editSource},
        {title : 'Edit Description',      onClick : this.editDescription},
        {title : 'Edit Related Article',  onClick : this.editRelatedArticle}
      ]
    });
  },

  _createManageMenu : function() {
    return new dc.ui.Menu({
      label : 'Manage',
      items : [
        {title : 'Set Public Access',               onClick : _.bind(this._setSelectedAccess, this, dc.access.PUBLIC)},
        {title : 'Set Private Access',              onClick : _.bind(this._setSelectedAccess, this, dc.access.PRIVATE)},
        {title : 'Set Private to my Organization',  onClick : _.bind(this._setSelectedAccess, this, dc.access.ORGANIZATION), className : 'divider'},
        // {title : 'Register Published Document',     onClick : this._registerDocument},
        {title : 'Delete Documents',                onClick : this._deleteSelectedDocuments}
      ]
    });
  },

  _createConnectionsMenu : function() {
    var me = this;
    var items = [
      {title : 'Entities', onClick : this._openEntities},
      {title : 'Timeline', onClick : this._openTimeline, className : 'divider'}
    ];
    items = items.concat(_.map(['city', 'country', 'organization',
        'person', 'place', 'state', 'term'], function(kind) {
      return {title : Entities.DISPLAY_NAME[kind], onClick : _.bind(me._openConnections, me, kind)};
    }));
    return new dc.ui.Menu({id : 'connections_menu', label : 'Connections', items : items});
  },

  _openCalais : function() {
    window.open('http://opencalais.com');
  }

});