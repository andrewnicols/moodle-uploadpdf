var currentcomment = null;	// The comment that is currently being edited
var editbox = null;		// The edit box that is currently displayed
var resizing = false;		// A box is being resized (so disable dragging)
var server = null;		// The object use to send data back to the server
var context_quicklist = null;
var context_comment = null;
var quicklist = null;

var ServerComm = new Class({
	Implements: [Events],
	id: null,
	userid: null,
	pageno: null,
	sesskey: null,
	url: null,
	
	initialize: function(settings) {
	    this.id = settings.id;
	    this.userid = settings.userid;
	    this.pageno = settings.pageno;
	    this.sesskey = settings.sesskey;
	    this.url = settings.updatepage;
	},
	
	updatecomment: function(comment) {
	    var waitel = new Element('div');
	    waitel.set('class', 'wait');
	    comment.adopt(waitel);
	    comment.store('oldcolour', comment.retrieve('colour'));
	    var request = new Request.JSON({
		    url: this.url,
		    
		    onSuccess: function(resp) {
			waitel.destroy();

			if (resp.error == 0) {
			    comment.store('id', resp.id);
			    //setcommentcontent(comment, resp.text);
			    // Re-attach drag and resize ability
			    comment.retrieve('drag').attach();
			} else {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.updatecomment(comment);
			    } else {
				// Re-attach drag and resize ability
				comment.retrieve('drag').attach();
			    }
			}
		    },
		    
		    onFailure: function(req) {
			waitel.destroy();
			if (confirm(server_config.lang_servercommfailed)) {
			    server.updatecomment(comment);
			} else {
			    comment.retrieve('drag').attach();
			}
		    }

		});

	    request.send({
		    data: {
		        action: 'update',
			comment_position_x: comment.getStyle('left'),
			comment_position_y: comment.getStyle('top'),
			comment_width: comment.getStyle('width'),
			comment_text: comment.retrieve('rawtext'),
    		        comment_id: comment.retrieve('id'),
			comment_colour: comment.retrieve('colour'),
			id: this.id,
			userid: this.userid,
			pageno: this.pageno,
			sesskey: this.sesskey
			    }
		});
	},
	
	removecomment: function(cid) {
	    var request = new Request.JSON({
		    url: this.url,
		    onSuccess: function(resp) {
			if (resp.error != 0) {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.removecomment(cid);
			    }
			}
		    },
		    onFailure: function(resp) {
			if (confirm(server_config.lang_servercommfailed)) {
			    server.removecomment(cid);
			}
		    }
		});

	    request.send({
		    data: {
  			    action: 'delete',
			    commentid: cid,
			    id: this.id,
			    userid: this.userid,
			    pageno: this.pageno,
			    sesskey: this.sesskey
			    }
		});
	},
	
	getcomments: function() {
	    var waitel = new Element('div');
	    waitel.set('class', 'pagewait');
	    $('pdfholder').adopt(waitel);
	    	    
	    var request = new Request.JSON({
		    url: this.url,

		    onSuccess: function(resp) {
			if (resp.error == 0) {
			    waitel.destroy();
			    resp.comments.each(function(comment) {
				    cb = makecommentbox(comment.position, comment.text, comment.colour);
				    if (Browser.Engine.trident) {
					// Does not work with FF & Moodle
					cb.setStyle('width',comment.width);
				    } else {
					// Does not work with IE
					var style = cb.get('style')+' width:'+comment.width+'px;';
					cb.set('style',style);
				    }

				    cb.store('id', comment.id);
				});
			} else {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.getcomments();
			    } else {
				waitel.destroy();
			    }
			}
		    },

		    onFailure: function(resp) {
			if (confirm(server_config.lang_servercommfailed)) {
			    server.getcomments();
			} else {
			    waitel.destroy();
			}
		    }
		});

	    request.send({ data: {
			    action: 'getcomments',
			    id: this.id,
			    userid: this.userid,
			    pageno: this.pageno,
			    sesskey: this.sesskey
			    } });
	    
	},

	getquicklist: function() {
	    var request = new Request.JSON({
		    url: this.url,

		    onSuccess: function(resp) {
			if (resp.error == 0) {
			    resp.quicklist.each(addtoquicklist);  // Assume contains: id, rawtext, colour, width
			} else {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.getquicklist();
			    }
			}
		    },

		    onFailure: function(resp) {
			if (confirm(server_config.lang_servercommfailed)) {
			    server.getquicklist();
			}
		    }
		});

	    request.send({ data: {
		            action: 'getquicklist',
			    id: this.id,
			    userid: this.userid, // This and pageno are not strictly needed, but are checked for on the server
			    pageno: this.pageno,
			    sesskey: this.sesskey
			    } });
	},

	addtoquicklist: function(element) {
	    var request = new Request.JSON({
		    url: this.url,

		    onSuccess: function(resp) {
			if (resp.error == 0) {
			    addtoquicklist(resp.item);  // Assume contains: id, rawtext, colour, width
			} else {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.addtoquicklist(element);
			    }
			}
		    },
		    
		    onFailure: function(resp) {
			if (confirm(server_config.lang_servercommfailed)) {
			    server.addtoquicklist(element);
			}
		    }
		});

	    request.send({ data: {
			    action: 'addtoquicklist',
			    colour: element.retrieve('colour'),
			    text: element.retrieve('rawtext'),
			    width: element.getStyle('width').toInt(),
			    id: this.id,
			    userid: this.userid, // This and pageno are not strictly needed, but are checked for on the server
			    pageno: this.pageno,
			    sesskey: this.sesskey
			    } });
	},

	removefromquicklist: function(itemid) {
	    var request = new Request.JSON({
		    url: this.url,
		    onSuccess: function(resp) {
			if (resp.error == 0) {
			    removefromquicklist(resp.itemid);
			} else {
			    if (confirm(server_config.lang_errormessage+resp.errmsg+'\n'+server_config.lang_okagain)) {
				server.removefromquicklist(itemid);
			    }
			}
		    },

		    onFailure: function(resp) {
			if (confirm(server_config.lang_servercommfailed)) {
			    server.removefromquicklist(itemid);
			}
		    }
		});

	    request.send({ data: {
			action: 'removefromquicklist',
			    itemid: itemid,
			    id: this.id,
			    userid: this.userid, // This and pageno are not strictly needed, but are checked for on the server
			    pageno: this.pageno,
			    sesskey: this.sesskey
			    } });
	}
    });

function setcommentcontent(el, content) {
    el.store('rawtext', content);

    // Replace special characters with html entities
    content = content.replace(/</gi,'&lt;');
    content = content.replace(/>/gi,'&gt;');
    content = content.replace(/\n/gi, '<br />');
    var resizehandle = el.retrieve('resizehandle');
    el.set('html',content);
    el.adopt(resizehandle);
}

function updatelastcomment() {
    // Stop trapping 'escape'
    window.removeEvent('keydown', typingcomment);

    var updated = false;
    var content = null;
    if ($defined(editbox)) {
	content = editbox.get('value');
	editbox.destroy();
	editbox = null;
    }
    if ($defined(currentcomment)) {
	if (!$defined(content) || (content.trim() == '')) {
	    id = currentcomment.retrieve('id');
	    if (id != -1) {
		server.removecomment(id);
	    }
	    currentcomment.destroy();

	} else {
	    oldcolour = currentcomment.retrieve('oldcolour');
	    newcolour = currentcomment.retrieve('colour');
	    if ((content == currentcomment.retrieve('rawtext')) && (newcolour == oldcolour)) {
		setcommentcontent(currentcomment, content);
		currentcomment.retrieve('drag').attach();
		// Do not update the server when the text is unchanged
	    } else {
		setcommentcontent(currentcomment, content);
		server.updatecomment(currentcomment);
	    }
	}
	currentcomment = null;
	updated = true;
    }

    return updated;
}

function makeeditbox(comment, content) {
    if (!$defined(content)) {
	content = '';
    }
    
    editbox = new Element('textarea');
    editbox.set('rows', '5');
    editbox.set('wrap', 'soft');
    editbox.set('value', content);
    comment.adopt(editbox);
    editbox.focus();

    window.addEvent('keydown', typingcomment);
    comment.retrieve('drag').detach(); // No dragging whilst editing (it messes up the text selection)
}

function makecommentbox(position, content, colour) {
    // Create the comment box
    newcomment = new Element('div');
    $('pdfholder').adopt(newcomment);

    if ($defined(colour)) {
	setcolourclass(colour, newcomment);
    } else {
	setcolourclass(getcurrentcolour(), newcomment);
    }
    newcomment.store('oldcolour',colour);
    //newcomment.set('class', 'comment');
    if (Browser.Engine.trident) {
	// Does not work with FF & Moodle
	newcomment.setStyles({ left: position.x, top: position.y });
    } else {
	// Does not work with IE
	newcomment.set('style', 'position:absolute; top:'+position.y+'px; left:'+position.x+'px;');
    }
    newcomment.store('id', -1);
    
    if (context_comment) {
	context_comment.addmenu(newcomment);
    }

    var drag = newcomment.makeDraggable({
	    container: 'pdfholder',
	    onCancel: editcomment, // Click without drag = edit
	    onStart: function(el) {
		if (resizing) {
		    el.retrieve('drag').stop();
		} else if (el.retrieve('id') == -1) {
		    el.retrieve('drag').stop();
		}
	    },
	    onComplete: function(el) { server.updatecomment(el); }
	});
    newcomment.store('drag', drag); // Remember the drag object so  we can switch it on later

    var resizehandle = new Element('div');
    resizehandle.set('class','resizehandle');
    newcomment.adopt(resizehandle);
    var resize = newcomment.makeResizable({
	    container: 'pdfholder',
	    handle: resizehandle,
	    modifiers: {'x': 'width', 'y': null},
	    onBeforeStart: function(el) { resizing = true; },
	    onStart: function(el) {
		// Do not allow resizes on comments that have not yet
		// got an id from the server (except when still editing
		// the text, as that is OK)
		if (!$defined(editbox)) {
		    if (el.retrieve('id') == -1) {
			el.retrieve('resize').stop();
		    }
		}
	    },
	    onComplete: function(el) {
		resizing = false;
		if (!$defined(editbox)) { 
		    server.updatecomment(el); // Do not update on resize when editing the text
		}
	    }
	});
    newcomment.store('resize', resize);
    newcomment.store('resizehandle', resizehandle);

    // Add the edit box to it
    if ($defined(content)) {
	setcommentcontent(newcomment, content);
    } else {
	makeeditbox(newcomment);
    }

    return newcomment;
}

function addcomment(e) {
    if (updatelastcomment()) {
	return;
    }
   
    // Calculate the relative position of the comment
    imgpos = $('pdfimg').getPosition();
    var offs = new Object();
    offs.x = e.page.x - imgpos.x;
    offs.y = e.page.y - imgpos.y;

    currentcomment = makecommentbox(offs);
}

function editcomment(el) {
    if (currentcomment == el) {
	return;
    }
    updatelastcomment();

    currentcomment = el;
    var resizehandle = currentcomment.retrieve('resizehandle');
    currentcomment.set('html','');
    currentcomment.adopt(resizehandle);
    var content = currentcomment.retrieve('rawtext');
    makeeditbox(currentcomment, content);
    setcurrentcolour(currentcomment.retrieve('colour'));
}

function typingcomment(e) {
    if (e.key == 'esc') {
	updatelastcomment();
	e.stop();
    }
}

function getcurrentcolour() {
    var el = $('choosecolour');
    var idx = el.selectedIndex;
    return el[idx].value;
}

function setcurrentcolour(colour) {
    var el = $('choosecolour');
    var i;
    for (i=0; i<el.length; i++) {
	if (el[i].value == colour) {
	    el.selectedIndex = i;
	    return;
	}
    }
}

function setcolourclass(colour, comment) {
    if (comment) {
	if (colour == 'red') {
	    comment.set('class','comment commentred');
	} else if (colour == 'green') {
	    comment.set('class','comment commentgreen');
	} else if (colour == 'blue') {
	    comment.set('class','comment commentblue');
	} else if (colour == 'white') {
	    comment.set('class','comment commentwhite');
	} else if (colour == 'clear') {
	    comment.set('class','comment commentclear');
	} else {
	    // Default: yellow comment box
	    comment.set('class','comment commentyellow');
	    colour = 'yellow';
	}
	comment.store('colour', colour);
    }
}

function changecolour(e) {
    if (currentcomment) {
	var col = getcurrentcolour();
	if (col != currentcomment.retrieve('colour')) {
	    setcolourclass(getcurrentcolour(), currentcomment);
	}
    }
    Cookie.write('uploadpdf_colour', getcurrentcolour());
}

function startjs() {
    new Asset.css('style/annotate.css');
    server = new ServerComm(server_config);
    server.getcomments();
    $('pdfimg').addEvent('click', addcomment);
    var colour = Cookie.read('uploadpdf_colour');
    if ($defined(colour)) {
	setcurrentcolour(colour);
    }
    $('choosecolour').addEvent('change', changecolour);
}

function context_quicklistnoitems() {
    if (context_quicklist.quickcount == 0) {
	if (!context_quicklist.menu.getElement('a[href$=noitems]')) {
	    // TODO make translatable
	    context_quicklist.addItem('noitems', 'No items in Quicklist &#0133;', null, function() { alert("Right-click on a comment to copy it to the quicklist"); });
	}
    } else {
	context_quicklist.removeItem('noitems');
    }
}

function addtoquicklist(item) {
    var itemid = item.id;
    var itemtext = item.text.trim().replace('\n','');
    if (itemtext.length > 30) {
	itemtext = itemtext.substring(0, 30) + '&#0133;';
    }
    itemtext = itemtext.replace('<','&lt;').replace('>','&gt;');

    quicklist[itemid] = item;

    context_quicklist.addItem(itemid, itemtext, server_config.deleteicon, function(id, menu) {
	    var imgpos = $('pdfimg').getPosition();
	    var pos = new Object();
	    pos.x = menu.menu.getStyle('left').toInt() - imgpos.x;
	    pos.y = menu.menu.getStyle('top').toInt() - imgpos.y + 20;
	    var cb = makecommentbox(pos, quicklist[id].text, quicklist[id].colour);
	    if (Browser.Engine.trident) {
		// Does not work with FF & Moodle
		cb.setStyle('width',quicklist[id].width);
	    } else {
		// Does not work with IE
		var style = cb.get('style')+' width:'+quicklist[id].width+'px;';
		cb.set('style',style);
	    }
	    server.updatecomment(cb);
	} );

    context_quicklist.quickcount++;
    context_quicklistnoitems();
}

function removefromquicklist(itemid) {
    context_quicklist.removeItem(itemid);
    context_quicklist.quickcount--;
    context_quicklistnoitems();
}

function initcontextmenu() {
    //create a context menu
    context_quicklist = new ContextMenu({
	    targets: '',
	    menu: 'context-quicklist',
	    actions: {
		removeitem: function(itemid, menu) {
		    server.removefromquicklist(itemid);
		}
	    },
	    offsets: { x: 2, y:-20 }
	});
    context_quicklist.addmenu($('pdfimg'));
    context_quicklist.quickcount = 0;
    context_quicklistnoitems();
    quicklist = new Array();

    context_comment = new ContextMenu({
	    targets: '',
	    menu: 'context-comment',
	    actions: {
		addtoquicklist: function(element,ref) {
		    server.addtoquicklist(element);
		}
	    },
	    offsets: { x:2, y:-20 }
	});

    server.getquicklist();
}


window.addEvent('domready', function() {
	startjs();
	initcontextmenu();
    });
