
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] == obj) {
                return i;
            }
        }
        return -1;
    }
}
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn, scope) {
        for (var i = 0, len = this.length; i < len; ++i) {
            fn.call(scope || this, this[i], i, this);
        }
    }
}
var JSON, isStrict;

JSONEditor = function (container, options, json) {
    if (!JSON) {
        throw new Error('您当前使用的浏览器不支持 JSON. \n\n' +
            '请下载安装最新版本的浏览器, 本站推荐Google Chrome.\n' +
            '(PS: 当前主流浏览器都支持JSON).');
    }

    if (!container) {
        throw new Error('没有提供容器元素.');
    }
    this.container = container;
    this.dom = {};

    this._setOptions(options);

    if (this.options.history && this.editable) {
        this.history = new JSONEditor.History(this);
    }

    this._createFrame();
    this._createTable();
    isStrict = options.isStrict;
    this.set(json || {});
};
JSONEditor.prototype._setOptions = function (options) {
    this.options = {
        search: true,
        history: true,
        mode: 'editor',
        name: undefined
    };
    if (options) {
        for (var prop in options) {
            if (options.hasOwnProperty(prop)) {
                this.options[prop] = options[prop];
            }
        }
        if (options.enableSearch) {
            this.options.search = options.enableSearch;
        }
        if (options.enableHistory) {
            this.options.search = options.enableHistory;
        }
    }
    this.editable = (this.options.mode != 'viewer');
};
JSONEditor.focusNode = undefined;

JSONEditor.prototype.set = function (json, name) {

    if (name) {
        this.options.name = name;
    }


    if (json instanceof Function || (json === undefined)) {
        this.clear();
    } else {
        this.content.removeChild(this.table);


        var params = {
            'field': this.options.name,
            'value': json
        };
        var node = new JSONEditor.Node(this, params);
        this._setRoot(node);


        var recurse = false;
        this.node.expand(recurse);

        this.content.appendChild(this.table);
    }


    if (this.history) {
        this.history.clear();
    }
};


JSONEditor.prototype.get = function () {

    if (JSONEditor.focusNode) {
        JSONEditor.focusNode.blur();
    }

    if (this.node) {
        return this.node.getValue();
    } else {
        return undefined;
    }
};


JSONEditor.prototype.setName = function (name) {
    this.options.name = name;
    if (this.node) {
        this.node.updateField(this.options.name);
    }
};


JSONEditor.prototype.getName = function () {
    return this.options.name;
};


JSONEditor.prototype.clear = function () {
    if (this.node) {
        this.node.collapse();
        this.tbody.removeChild(this.node.getDom());
        delete this.node;
    }
};


JSONEditor.prototype._setRoot = function (node) {
    this.clear();

    this.node = node;


    this.tbody.appendChild(node.getDom());
};


JSONEditor.prototype.search = function (text) {
    var results;
    if (this.node) {
        this.content.removeChild(this.table);
        results = this.node.search(text);
        this.content.appendChild(this.table);
    } else {
        results = [];
    }

    return results;
};


JSONEditor.prototype.expandAll = function () {
    if (this.node) {
        this.content.removeChild(this.table);
        this.node.expand();
        this.content.appendChild(this.table);
    }
};


JSONEditor.prototype.collapseAll = function () {
    if (this.node) {
        this.content.removeChild(this.table);
        this.node.collapse();
        this.content.appendChild(this.table);
    }
};


JSONEditor.prototype.onAction = function (action, params) {

    if (this.history) {
        this.history.add(action, params);
    }


    if (this.options.change) {
        try {
            this.options.change();
        } catch (err) {

        }
    }
};



JSONEditor.prototype.focus = function () {

};


JSONEditor.prototype.scrollTo = function (top) {
    var content = this.content;
    if (content) {

        var editor = this;
        if (editor.animateTimeout) {
            clearTimeout(editor.animateTimeout);
            delete editor.animateTimeout;
        }


        var height = content.clientHeight;
        var bottom = content.scrollHeight - height;
        var finalScrollTop = Math.min(Math.max(top - height / 4, 0), bottom);


        var animate = function () {
            var scrollTop = content.scrollTop;
            var diff = (finalScrollTop - scrollTop);
            if (Math.abs(diff) > 3) {
                content.scrollTop += diff / 3;
                editor.animateTimeout = setTimeout(animate, 50);
            }
        };
        animate();
    }
};



JSONEditor.History = function (editor) {
    this.editor = editor;
    this.clear();


    this.actions = {
        'editField': {
            'undo': function (obj) {
                obj.params.node.updateField(obj.params.oldValue);
            },
            'redo': function (obj) {
                obj.params.node.updateField(obj.params.newValue);
            }
        },
        'editValue': {
            'undo': function (obj) {
                obj.params.node.updateValue(obj.params.oldValue);
            },
            'redo': function (obj) {
                obj.params.node.updateValue(obj.params.newValue);
            }
        },
        'appendNode': {
            'undo': function (obj) {
                obj.params.parent.removeChild(obj.params.node);
            },
            'redo': function (obj) {
                obj.params.parent.appendChild(obj.params.node);
            }
        },
        'removeNode': {
            'undo': function (obj) {
                var parent = obj.params.parent;
                var beforeNode = parent.childs[obj.params.index] || parent.append;
                parent.insertBefore(obj.params.node, beforeNode);
            },
            'redo': function (obj) {
                obj.params.parent.removeChild(obj.params.node);
            }
        },
        'duplicateNode': {
            'undo': function (obj) {
                obj.params.parent.removeChild(obj.params.clone);
            },
            'redo': function (obj) {

                obj.params.parent.insertBefore(obj.params.clone, obj.params.node);
            }
        },
        'changeType': {
            'undo': function (obj) {
                obj.params.node.changeType(obj.params.oldType);
            },
            'redo': function (obj) {
                obj.params.node.changeType(obj.params.newType);
            }
        },
        'moveNode': {
            'undo': function (obj) {
                obj.params.startParent.moveTo(obj.params.node, obj.params.startIndex);
            },
            'redo': function (obj) {
                obj.params.endParent.moveTo(obj.params.node, obj.params.endIndex);
            }
        }



    };
};


JSONEditor.History.prototype.onChange = function () { };


JSONEditor.History.prototype.add = function (action, params) {
    this.index++;
    this.history[this.index] = {
        'action': action,
        'params': params,
        'timestamp': new Date()
    };


    if (this.index < this.history.length - 1) {
        this.history.splice(this.index + 1, this.history.length - this.index - 1);
    }


    this.onChange();
};


JSONEditor.History.prototype.clear = function () {
    this.history = [];
    this.index = -1;


    this.onChange();
};


JSONEditor.History.prototype.canUndo = function () {
    return (this.index >= 0);
};


JSONEditor.History.prototype.canRedo = function () {
    return (this.index < this.history.length - 1);
};


JSONEditor.History.prototype.undo = function () {
    if (this.canUndo()) {
        var obj = this.history[this.index];
        if (obj) {
            var action = this.actions[obj.action];
            if (action && action.undo) {
                action.undo(obj);
            } else {

            }
        }
        this.index--;


        this.onChange();
    }
};


JSONEditor.History.prototype.redo = function () {
    if (this.canRedo()) {
        this.index++;

        var obj = this.history[this.index];
        if (obj) {
            if (obj) {
                var action = this.actions[obj.action];
                if (action && action.redo) {
                    action.redo(obj);
                } else {

                }
            }
        }


        this.onChange();
    }
};



JSONEditor.Node = function (editor, params) {
    this.editor = editor;
    this.dom = {};
    this.expanded = false;

    if (params && (params instanceof Object)) {
        this.setField(params.field, params.fieldEditable);
        this.setValue(params.value);
    } else {
        this.setField();
        this.setValue();
    }
};


JSONEditor.Node.prototype.setParent = function (parent) {
    this.parent = parent;
};


JSONEditor.Node.prototype.getParent = function () {
    return this.parent;
};


JSONEditor.Node.prototype.setField = function (field, fieldEditable) {
    this.field = field;
    this.fieldEditable = (fieldEditable == true);
};


JSONEditor.Node.prototype.getField = function () {
    if (this.field === undefined) {
        this._getDomField();
    }

    return this.field;
};


JSONEditor.Node.prototype.setValue = function (value) {
    var childValue, child;


    var childs = this.childs;
    if (childs) {
        while (childs.length) {
            this.removeChild(childs[0]);
        }
    }



    this.type = this._getType(value);
    if (this.type == 'array') {

        this.childs = [];
        for (var i = 0, iMax = value.length; i < iMax; i++) {
            childValue = value[i];
            if (childValue !== undefined && !(childValue instanceof Function)) {

                child = new JSONEditor.Node(this.editor, {
                    'value': childValue
                });
                this.appendChild(child);
            }
        }
        this.value = '';
    } else if (this.type == 'object') {

        this.childs = [];
        for (var childField in value) {
            if (value.hasOwnProperty(childField)) {
                childValue = value[childField];
                if (childValue !== undefined && !(childValue instanceof Function)) {

                    child = new JSONEditor.Node(this.editor, {
                        'field': childField,
                        'value': childValue
                    });
                    this.appendChild(child);
                }
            }
        }
        this.value = '';
    } else {

        this.childs = undefined;
        this.value = value;

    }
};


JSONEditor.Node.prototype.getValue = function () {


    if (this.type == 'array') {
        var arr = [];
        this.childs.forEach(function (child) {
            arr.push(child.getValue());
        });
        return arr;
    } else if (this.type == 'object') {
        var obj = {};
        this.childs.forEach(function (child) {
            obj[child.getField()] = child.getValue();
        });
        return obj;
    } else {
        if (this.value === undefined) {
            this._getDomValue();
        }

        return this.value;
    }
};


JSONEditor.Node.prototype.getLevel = function () {
    return (this.parent ? this.parent.getLevel() + 1 : 0);
};


JSONEditor.Node.prototype.clone = function () {
    var clone = new JSONEditor.Node(this.editor);
    clone.type = this.type;
    clone.field = this.field;
    clone.fieldInnerText = this.fieldInnerText;
    clone.fieldEditable = this.fieldEditable;
    clone.value = this.value;
    clone.valueInnerText = this.valueInnerText;
    clone.expanded = this.expanded;

    if (this.childs) {

        var cloneChilds = [];
        this.childs.forEach(function (child) {
            var childClone = child.clone();
            childClone.setParent(clone);
            cloneChilds.push(childClone);
        });
        clone.childs = cloneChilds;
    } else {

        clone.childs = undefined;
    }

    return clone;
};


JSONEditor.Node.prototype.expand = function (recurse) {
    if (!this.childs) {
        return;
    }


    this.expanded = true;
    if (this.dom.expand) {
        this.dom.expand.className = 'jsoneditor-expanded';
    }

    this.showChilds();

    if (recurse != false) {
        this.childs.forEach(function (child) {
            child.expand(recurse);
        });
    }
};


JSONEditor.Node.prototype.collapse = function (recurse) {
    if (!this.childs) {
        return;
    }

    this.hideChilds();


    if (recurse != false) {
        this.childs.forEach(function (child) {
            child.collapse(recurse);
        });

    }


    if (this.dom.expand) {
        this.dom.expand.className = 'jsoneditor-collapsed';
    }
    this.expanded = false;
};


JSONEditor.Node.prototype.showChilds = function () {
    var childs = this.childs;
    if (!childs) {
        return;
    }
    if (!this.expanded) {
        return;
    }

    var tr = this.dom.tr;
    var table = tr ? tr.parentNode : undefined;
    if (table) {

        var append = this.getAppend();
        var nextTr = tr.nextSibling;
        if (nextTr) {
            table.insertBefore(append, nextTr);
        } else {
            table.appendChild(append);
        }


        this.childs.forEach(function (child) {
            table.insertBefore(child.getDom(), append);
            child.showChilds();
        });
    }
};


JSONEditor.Node.prototype.hide = function () {
    var tr = this.dom.tr;
    var table = tr ? tr.parentNode : undefined;
    if (table) {
        table.removeChild(tr);
    }
    this.hideChilds();
};



JSONEditor.Node.prototype.hideChilds = function () {
    var childs = this.childs;
    if (!childs) {
        return;
    }
    if (!this.expanded) {
        return;
    }


    var append = this.getAppend();
    if (append.parentNode) {
        append.parentNode.removeChild(append);
    }


    this.childs.forEach(function (child) {
        child.hide();
    });
};



JSONEditor.Node.prototype.appendChild = function (node) {
    if (this.type == 'array' || this.type == 'object') {

        node.setParent(this);
        node.fieldEditable = (this.type == 'object');
        if (this.type == 'array') {
            node.index = this.childs.length;
        }
        this.childs.push(node);

        if (this.expanded) {

            var newtr = node.getDom();
            var appendTr = this.getAppend();
            var table = appendTr ? appendTr.parentNode : undefined;
            if (appendTr && table) {
                table.insertBefore(newtr, appendTr);
            }

            node.showChilds();
        }

        this.updateDom({
            'updateIndexes': true
        });
        node.updateDom({
            'recurse': true
        });
    }
};



JSONEditor.Node.prototype.moveBefore = function (node, beforeNode) {
    if (this.type == 'array' || this.type == 'object') {


        var tbody = (this.dom.tr) ? this.dom.tr.parentNode : undefined;
        if (tbody) {
            var trTemp = document.createElement('tr');
            trTemp.style.height = tbody.clientHeight + 'px';
            tbody.appendChild(trTemp);
        }

        var parent = node.getParent();
        if (parent) {
            parent.removeChild(node);
        }
        if (beforeNode instanceof JSONEditor.AppendNode) {
            this.appendChild(node);
        } else {
            this.insertBefore(node, beforeNode);
        }

        if (tbody) {
            tbody.removeChild(trTemp);
        }
    }
};


JSONEditor.Node.prototype.moveTo = function (node, index) {
    if (node.parent == this) {

        var currentIndex = this.childs.indexOf(node);
        if (currentIndex < index) {

            index++;
        }
    }

    var beforeNode = this.childs[index] || this.append;
    this.moveBefore(node, beforeNode);
};


JSONEditor.Node.prototype.insertBefore = function (node, beforeNode) {
    if (this.type == 'array' || this.type == 'object') {
        if (beforeNode == this.append) {



            node.setParent(this);
            node.fieldEditable = (this.type == 'object');
            this.childs.push(node);
        } else {

            var index = this.childs.indexOf(beforeNode);
            if (index == -1) {
                throw new Error('节点未找到.');
            }


            node.setParent(this);
            node.fieldEditable = (this.type == 'object');
            this.childs.splice(index, 0, node);
        }

        if (this.expanded) {

            var newTr = node.getDom();
            var nextTr = beforeNode.getDom();
            var table = nextTr ? nextTr.parentNode : undefined;
            if (nextTr && table) {
                table.insertBefore(newTr, nextTr);
            }

            node.showChilds();
        }

        this.updateDom({
            'updateIndexes': true
        });
        node.updateDom({
            'recurse': true
        });
    }
};


JSONEditor.Node.prototype.search = function (text) {
    var results = [];
    var index;
    var search = text ? text.toLowerCase() : undefined;


    delete this.searchField;
    delete this.searchValue;


    if (this.field != undefined) {
        var field = String(this.field).toLowerCase();
        index = field.indexOf(search);
        if (index != -1) {
            this.searchField = true;
            results.push({
                'node': this,
                'elem': 'field'
            });
        }


        this._updateDomField();
    }


    if (this.type == 'array' || this.type == 'object') {



        if (this.childs) {
            var childResults = [];
            this.childs.forEach(function (child) {
                childResults = childResults.concat(child.search(text));
            });
            results = results.concat(childResults);
        }


        if (search != undefined) {
            var recurse = false;
            if (childResults.length == 0) {
                this.collapse(recurse);
            } else {
                this.expand(recurse);
            }
        }
    } else {

        if (this.value != undefined) {
            var value = String(this.value).toLowerCase();
            index = value.indexOf(search);
            if (index != -1) {
                this.searchValue = true;
                results.push({
                    'node': this,
                    'elem': 'value'
                });
            }
        }


        this._updateDomValue();
    }

    return results;
};


JSONEditor.Node.prototype.scrollTo = function () {
    if (!this.dom.tr || !this.dom.tr.parentNode) {

        var parent = this.parent;
        var recurse = false;
        while (parent) {
            parent.expand(recurse);
            parent = parent.parent;
        }
    }

    if (this.dom.tr && this.dom.tr.parentNode) {
        this.editor.scrollTo(this.dom.tr.offsetTop);
    }
};


JSONEditor.Node.prototype.focus = function (field) {
    if (this.dom.tr && this.dom.tr.parentNode) {
        if (field != 'value' && this.fieldEditable) {
            var domField = this.dom.field;
            if (domField) {
                domField.focus();
            }
        } else {
            var domValue = this.dom.value;
            if (domValue) {
                domValue.focus();
            }
        }
    }
};


JSONEditor.Node.prototype.blur = function () {

    this._getDomValue(false);
    this._getDomField(false);
};


JSONEditor.Node.prototype._duplicate = function (node) {
    var clone = node.clone();




    this.insertBefore(clone, node);

    return clone;
};


JSONEditor.Node.prototype.containsNode = function (node) {
    if (this == node) {
        return true;
    }

    var childs = this.childs;
    if (childs) {

        for (var i = 0, iMax = childs.length; i < iMax; i++) {
            if (childs[i].containsNode(node)) {
                return true;
            }
        }
    }

    return false;
};


JSONEditor.Node.prototype._move = function (node, beforeNode) {
    if (node == beforeNode) {

        return;
    }


    if (node.containsNode(this)) {
        throw new Error('不能把区域移动到自身的子节点.');
    }


    if (node.parent) {
        node.parent.removeChild(node);
    }


    var clone = node.clone();
    node.clearDom();


    if (beforeNode) {
        this.insertBefore(clone, beforeNode);
    } else {
        this.appendChild(clone);
    }


};


JSONEditor.Node.prototype.removeChild = function (node) {
    if (this.childs) {
        var index = this.childs.indexOf(node);

        if (index != -1) {
            node.hide();


            delete node.searchField;
            delete node.searchValue;

            var removedNode = this.childs.splice(index, 1)[0];

            this.updateDom({
                'updateIndexes': true
            });

            return removedNode;
        }
    }

    return undefined;
};


JSONEditor.Node.prototype._remove = function (node) {
    this.removeChild(node);
};


JSONEditor.Node.prototype.changeType = function (newType) {
    var oldType = this.type;

    if ((newType == 'string' || newType == 'auto') && (oldType == 'string' || oldType == 'auto')) {

        this.type = newType;
    } else {


        var table = this.dom.tr ? this.dom.tr.parentNode : undefined;
        var lastTr;
        if (this.expanded) {
            lastTr = this.getAppend();
        } else {
            lastTr = this.getDom();
        }
        var nextTr = (lastTr && lastTr.parentNode) ? lastTr.nextSibling : undefined;


        this.hide();
        this.clearDom();


        this.type = newType;


        if (newType == 'object') {
            if (!this.childs) {
                this.childs = [];
            }

            this.childs.forEach(function (child, index) {
                child.clearDom();
                delete child.index;
                child.fieldEditable = true;
                if (child.field == undefined) {
                    child.field = index;
                }
            });

            if (oldType == 'string' || oldType == 'auto') {
                this.expanded = true;
            }
        } else if (newType == 'array') {
            if (!this.childs) {
                this.childs = [];
            }

            this.childs.forEach(function (child, index) {
                child.clearDom();
                child.fieldEditable = false;
                child.index = index;
            });

            if (oldType == 'string' || oldType == 'auto') {
                this.expanded = true;
            }
        } else {
            this.expanded = false;
        }


        if (table) {
            if (nextTr) {
                table.insertBefore(this.getDom(), nextTr);
            } else {
                table.appendChild(this.getDom());
            }
        }
        this.showChilds();
    }

    if (newType == 'auto' || newType == 'string') {

        if (newType == 'string') {
            this.value = String(this.value);
        } else {
            this.value = this._stringCast(String(this.value));
        }

        this.focus();
    }

    this.updateDom({
        'updateIndexes': true
    });
};


JSONEditor.Node.prototype._getDomValue = function (silent) {
    if (this.dom.value && this.type != 'array' && this.type != 'object') {
        this.valueInnerText = JSONEditor.getInnerText(this.dom.value);
    }

    if (this.valueInnerText != undefined) {
        try {

            var value;
            if (this.type == 'string') {
                value = this._unescapeHTML(this.valueInnerText);
            } else {
                var str = this._unescapeHTML(this.valueInnerText);
                value = this._stringCast(str);
            }
            if (value !== this.value) {
                var oldValue = this.value;
                this.value = value;
                this.editor.onAction('editValue', {
                    'node': this,
                    'oldValue': oldValue,
                    'newValue': value
                });
            }
        } catch (err) {
            this.value = undefined;

            if (silent != true) {
                throw err;
            }
        }
    }
};


JSONEditor.Node.prototype._updateDomValue = function () {
    var domValue = this.dom.value;
    if (domValue) {

        var v = this.value;
        var t = (this.type == 'auto') ? typeof (v) : this.type;
        var color = '';
        if (t == 'string') {
            color = 'green';
        } else if (t == 'number') {
            color = 'red';
        } else if (t == 'boolean') {
            color = 'blue';
        } else if (this.type == 'object' || this.type == 'array') {

            color = '';
        } else if (v === null) {
            color = 'purple';
        } else if (v === undefined) {

            color = 'green';
        }
        domValue.style.color = color;


        var isEmpty = (String(this.value) == '' && this.type != 'array' && this.type != 'object');
        if (isEmpty) {
            JSONEditor.addClassName(domValue, 'jsoneditor-empty');
        } else {
            JSONEditor.removeClassName(domValue, 'jsoneditor-empty');
        }


        if (this.searchValueActive) {
            JSONEditor.addClassName(domValue, 'jsoneditor-search-highlight-active');
        } else {
            JSONEditor.removeClassName(domValue, 'jsoneditor-search-highlight-active');
        }
        if (this.searchValue) {
            JSONEditor.addClassName(domValue, 'jsoneditor-search-highlight');
        } else {
            JSONEditor.removeClassName(domValue, 'jsoneditor-search-highlight');
        }


        JSONEditor.stripFormatting(domValue);
    }
};


JSONEditor.Node.prototype._updateDomField = function () {
    var domField = this.dom.field;
    if (domField) {

        var isEmpty = (String(this.field) == '');
        if (isEmpty) {
            JSONEditor.addClassName(domField, 'jsoneditor-empty');
        } else {
            JSONEditor.removeClassName(domField, 'jsoneditor-empty');
        }


        if (this.searchFieldActive) {
            JSONEditor.addClassName(domField, 'jsoneditor-search-highlight-active');
        } else {
            JSONEditor.removeClassName(domField, 'jsoneditor-search-highlight-active');
        }
        if (this.searchField) {
            JSONEditor.addClassName(domField, 'jsoneditor-search-highlight');
        } else {
            JSONEditor.removeClassName(domField, 'jsoneditor-search-highlight');
        }


        JSONEditor.stripFormatting(domField);
    }
};


JSONEditor.Node.prototype._getDomField = function (silent) {
    if (this.dom.field && this.fieldEditable) {
        this.fieldInnerText = JSONEditor.getInnerText(this.dom.field);
    }

    if (this.fieldInnerText != undefined) {
        try {
            var field = this._unescapeHTML(this.fieldInnerText);

            if (field !== this.field) {
                var oldField = this.field;
                this.field = field;
                this.editor.onAction('editField', {
                    'node': this,
                    'oldValue': oldField,
                    'newValue': field
                });
            }
        } catch (err) {
            this.field = undefined;

            if (silent != true) {
                throw err;
            }
        }
    }
};


JSONEditor.Node.prototype.clearDom = function () {




    this.dom = {};
};


JSONEditor.Node.prototype.getDom = function () {
    var dom = this.dom;
    if (dom.tr) {
        return dom.tr;
    }


    dom.tr = document.createElement('tr');
    dom.tr.className = 'jsoneditor-tr';
    dom.tr.node = this;

    if (this.editor.editable) {

        var tdDrag = document.createElement('td');
        tdDrag.className = 'jsoneditor-td';
        dom.drag = this._createDomDragArea();
        if (dom.drag) {
            tdDrag.appendChild(dom.drag);
        }
        dom.tr.appendChild(tdDrag);
    }


    var tdField = document.createElement('td');
    tdField.className = 'jsoneditor-td';
    dom.tr.appendChild(tdField);
    dom.expand = this._createDomExpandButton();
    dom.field = this._createDomField();
    dom.value = this._createDomValue();
    dom.tree = this._createDomTree(dom.expand, dom.field, dom.value);
    tdField.appendChild(dom.tree);

    if (this.editor.editable) {

        var tdType = document.createElement('td');
        tdType.className = 'jsoneditor-td jsoneditor-td-edit';
        dom.tr.appendChild(tdType);
        dom.type = this._createDomTypeButton();
        tdType.appendChild(dom.type);


        var tdDuplicate = document.createElement('td');
        tdDuplicate.className = 'jsoneditor-td jsoneditor-td-edit';
        dom.tr.appendChild(tdDuplicate);
        dom.duplicate = this._createDomDuplicateButton();
        if (dom.duplicate) {
            tdDuplicate.appendChild(dom.duplicate);
        }


        var tdRemove = document.createElement('td');
        tdRemove.className = 'jsoneditor-td jsoneditor-td-edit';
        dom.tr.appendChild(tdRemove);
        dom.remove = this._createDomRemoveButton();
        if (dom.remove) {
            tdRemove.appendChild(dom.remove);
        }
    }

    this.updateDom();

    return dom.tr;
};


JSONEditor.Node.prototype._onDragStart = function (event) {
    event = event || window.event;

    var node = this;
    if (!this.mousemove) {
        this.mousemove = JSONEditor.Events.addEventListener(document, 'mousemove',

            function (event) {
                node._onDrag(event);
            });
    }

    if (!this.mouseup) {
        this.mouseup = JSONEditor.Events.addEventListener(document, 'mouseup',

            function (event) {
                node._onDragEnd(event);
            });
    }


    JSONEditor.freezeHighlight = true;
    this.drag = {
        'oldCursor': document.body.style.cursor,
        'startParent': this.parent,
        'startIndex': this.parent.childs.indexOf(this)
    };
    document.body.style.cursor = 'move';

    JSONEditor.Events.preventDefault(event);
};


JSONEditor.Node.prototype._onDrag = function (event) {
    event = event || window.event;
    var trThis = this.dom.tr;



    var topThis = JSONEditor.getAbsoluteTop(trThis);
    var heightThis = trThis.offsetHeight;
    var mouseY = event.pageY || (event.clientY + document.body.scrollTop);
    if (mouseY < topThis) {

        var trPrev = trThis.previousSibling;
        var topPrev = JSONEditor.getAbsoluteTop(trPrev);
        var nodePrev = JSONEditor.getNodeFromTarget(trPrev);
        while (trPrev && mouseY < topPrev) {
            nodePrev = JSONEditor.getNodeFromTarget(trPrev);
            trPrev = trPrev.previousSibling;
            topPrev = JSONEditor.getAbsoluteTop(trPrev);
        }

        if (nodePrev) {
            trPrev = nodePrev.dom.tr;
            topPrev = JSONEditor.getAbsoluteTop(trPrev);
            if (mouseY > topPrev + heightThis) {
                nodePrev = undefined;
            }
        }

        if (nodePrev && nodePrev.parent) {
            nodePrev.parent.moveBefore(this, nodePrev);
        }
    } else {

        var trLast = (this.expanded && this.append) ? this.append.getDom() : this.dom.tr;
        var trFirst = trLast ? trLast.nextSibling : undefined;
        if (trFirst) {
            var topFirst = JSONEditor.getAbsoluteTop(trFirst);

            var nodeNext = undefined;
            var trNext = trFirst.nextSibling;
            var topNext = JSONEditor.getAbsoluteTop(trNext);
            var heightNext = trNext ? (topNext - topFirst) : 0;
            while (trNext && mouseY > topThis + heightNext) {
                nodeNext = JSONEditor.getNodeFromTarget(trNext);
                trNext = trNext.nextSibling;
                topNext = JSONEditor.getAbsoluteTop(trNext);
                heightNext = trNext ? (topNext - topFirst) : 0;
            }

            if (nodeNext && nodeNext.parent) {
                nodeNext.parent.moveBefore(this, nodeNext);
            }
        }
    }
    JSONEditor.Events.preventDefault(event);
};


JSONEditor.Node.prototype._onDragEnd = function (event) {
    event = event || window.event;

    var params = {
        'node': this,
        'startParent': this.drag.startParent,
        'startIndex': this.drag.startIndex,
        'endParent': this.parent,
        'endIndex': this.parent.childs.indexOf(this)
    };
    if ((params.startParent != params.endParent) || (params.startIndex != params.endIndex)) {

        this.editor.onAction('moveNode', params);
    }

    document.body.style.cursor = this.drag.oldCursor;
    delete JSONEditor.freezeHighlight;
    delete this.drag;
    this.setHighlight(false);

    if (this.mousemove) {
        JSONEditor.Events.removeEventListener(document, 'mousemove', this.mousemove);
        delete this.mousemove;
    }
    if (this.mouseup) {
        JSONEditor.Events.removeEventListener(document, 'mouseup', this.mouseup);
        delete this.mouseup;
    }

    JSONEditor.Events.preventDefault(event);
};


JSONEditor.Node.prototype._createDomDragArea = function () {
    if (!this.parent) {
        return undefined;
    }

    var domDrag = document.createElement('button');
    domDrag.className = 'jsoneditor-dragarea';
    domDrag.title = '可移动字段(拖放)';

    return domDrag;
};


JSONEditor.Node.prototype._createDomField = function () {
    return document.createElement('div');
};


JSONEditor.Node.prototype.setHighlight = function (highlight) {
    if (JSONEditor.freezeHighlight) {
        return;
    }

    if (this.dom.tr) {
        this.dom.tr.className = 'jsoneditor-tr' + (highlight ? ' jsoneditor-tr-highlight' : '');

        if (this.append) {
            this.append.setHighlight(highlight);
        }

        if (this.childs) {
            this.childs.forEach(function (child) {
                child.setHighlight(highlight);
            });
        }
    }
};


JSONEditor.Node.prototype.updateValue = function (value) {
    this.value = value;
    this.updateDom();
};


JSONEditor.Node.prototype.updateField = function (field) {
    this.field = field;
    this.updateDom();
};


JSONEditor.Node.prototype.updateDom = function (options) {

    var domTree = this.dom.tree;
    if (domTree) {
        domTree.style.marginLeft = this.getLevel() * 24 + 'px';
    }


    var domField = this.dom.field;
    if (domField) {
        if (this.fieldEditable == true) {

            domField.contentEditable = this.editor.editable;
            domField.spellcheck = false;
            domField.className = 'jsoneditor-field';
        } else {

            domField.className = 'jsoneditor-readonly';
        }

        var field;
        if (this.index != undefined) {
            field = this.index;
        } else if (this.field != undefined) {
            field = this.field;
        } else if (this.type == 'array' || this.type == 'object') {
            field = this.type;
        } else {
            field = 'field';
        }
        domField.innerHTML = this._escapeHTML(field);
    }


    var domValue = this.dom.value;
    if (domValue) {
        var count = this.childs ? this.childs.length : 0;
        if (this.type == 'array') {
            domValue.innerHTML = '[' + count + ']';
            domValue.title = this.type + ' 包含 ' + count + ' 项';
        } else if (this.type == 'object') {
            domValue.innerHTML = '{' + count + '}';
            domValue.title = this.type + ' 包含 ' + count + ' 项';
        } else {
            domValue.innerHTML = this._escapeHTML(this.value);
            delete domValue.title;
        }
    }


    this._updateDomField();
    this._updateDomValue();


    if (options && options.updateIndexes == true) {

        this._updateDomIndexes();
    }

    if (options && options.recurse == true) {

        if (this.childs) {
            this.childs.forEach(function (child) {
                child.updateDom(options);
            });
        }


        if (this.append) {
            this.append.updateDom();
        }
    }
};


JSONEditor.Node.prototype._updateDomIndexes = function () {
    var domValue = this.dom.value;
    var childs = this.childs;
    if (domValue && childs) {
        if (this.type == 'array') {
            childs.forEach(function (child, index) {
                child.index = index;
                var childField = child.dom.field;
                if (childField) {
                    childField.innerHTML = index;
                }
            });
        } else if (this.type == 'object') {
            childs.forEach(function (child) {
                if (child.index != undefined) {
                    delete child.index;

                    if (child.field == undefined) {
                        child.field = 'field';
                    }
                }
            });
        }
    }
};


JSONEditor.Node.prototype._createDomValue = function () {
    var domValue;

    if (this.type == 'array') {
        domValue = document.createElement('div');
        domValue.className = 'jsoneditor-readonly';
        domValue.innerHTML = '[...]';
    } else if (this.type == 'object') {
        domValue = document.createElement('div');
        domValue.className = 'jsoneditor-readonly';
        domValue.innerHTML = '{...}';
    } else if (this.type == 'string') {
        domValue = document.createElement('div');
        domValue.contentEditable = this.editor.editable;
        domValue.spellcheck = false;
        domValue.className = 'jsoneditor-value';
        domValue.innerHTML = this._escapeHTML(this.value);
    } else {
        domValue = document.createElement('div');
        domValue.contentEditable = this.editor.editable;
        domValue.spellcheck = false;
        domValue.className = 'jsoneditor-value';
        domValue.innerHTML = this._escapeHTML(this.value);
    }




    return domValue;
};


JSONEditor.Node.prototype._createDomExpandButton = function () {

    var expand = document.createElement('button');
    var expandable = (this.type == 'array' || this.type == 'object');
    if (expandable) {
        expand.className = this.expanded ? 'jsoneditor-expanded' : 'jsoneditor-collapsed';
        expand.title =
            '单击 可展开/折叠此字段. \n' +
            'Ctrl+单击 可展开/折叠所有子元素.';
    } else {
        expand.className = 'jsoneditor-invisible';
        expand.title = '';
    }

    return expand;
};



JSONEditor.Node.prototype._createDomTree = function (domExpand, domField, domValue) {
    var dom = this.dom;
    var domTree = document.createElement('table');
    var tbody = document.createElement('tbody');
    domTree.style.borderCollapse = 'collapse';
    domTree.appendChild(tbody);
    var tr = document.createElement('tr');
    tbody.appendChild(tr);


    var tdExpand = document.createElement('td');
    tdExpand.className = 'jsoneditor-td-tree';
    tr.appendChild(tdExpand);
    tdExpand.appendChild(domExpand);
    dom.tdExpand = tdExpand;


    var tdField = document.createElement('td');
    tdField.className = 'jsoneditor-td-tree';
    tr.appendChild(tdField);
    tdField.appendChild(domField);
    dom.tdField = tdField;


    var tdSeparator = document.createElement('td');
    tdSeparator.className = 'jsoneditor-td-tree';
    tr.appendChild(tdSeparator);
    if (this.type != 'object' && this.type != 'array') {
        tdSeparator.appendChild(document.createTextNode(':'));
        tdSeparator.className = 'jsoneditor-separator';
    }
    dom.tdSeparator = tdSeparator;


    var tdValue = document.createElement('td');
    tdValue.className = 'jsoneditor-td-tree';
    tr.appendChild(tdValue);
    tdValue.appendChild(domValue);
    dom.tdValue = tdValue;

    return domTree;
};


JSONEditor.Node.prototype.onEvent = function (event) {
    var type = event.type;
    var target = event.target || event.srcElement;
    var dom = this.dom;
    var node = this;
    var expandable = (this.type == 'array' || this.type == 'object');


    var domValue = dom.value;
    if (target == domValue) {
        switch (type) {
            case 'focus':
                JSONEditor.focusNode = this;
                break;

            case 'blur':
            case 'change':
                this._getDomValue(true);
                this._updateDomValue();
                if (this.value) {
                    domValue.innerHTML = this._escapeHTML(this.value);
                }
                break;

            case 'keyup':
                this._getDomValue(true);
                this._updateDomValue();
                break;

            case 'cut':
            case 'paste':
                setTimeout(function () {
                    node._getDomValue(true);
                    node._updateDomValue();
                }, 1);
                break;
        }
    }


    var domField = dom.field;
    if (target == domField) {
        switch (type) {
            case 'focus':
                JSONEditor.focusNode = this;
                break;

            case 'change':
            case 'blur':
                this._getDomField(true);
                this._updateDomField();
                if (this.field) {
                    domField.innerHTML = this._escapeHTML(this.field);
                }
                break;

            case 'keyup':
                this._getDomField(true);
                this._updateDomField();
                break;

            case 'cut':
            case 'paste':
                setTimeout(function () {
                    node._getDomField(true);
                    node._updateDomField();
                }, 1);
                break;
        }
    }


    var domDrag = dom.drag;
    if (target == domDrag) {
        switch (type) {
            case 'mousedown':
                this._onDragStart(event);
                break;
            case 'mouseover':
                this.setHighlight(true);
                break;
            case 'mouseout':
                this.setHighlight(false);
                break;
        }
    }


    var domExpand = dom.expand;
    if (target == domExpand) {
        if (type == 'click') {
            if (expandable) {
                this._onExpand(event);
            }
        }
    }


    var domDuplicate = dom.duplicate;
    if (target == domDuplicate) {
        switch (type) {
            case 'click':
                var clone = this.parent._duplicate(this);

                this.editor.onAction('duplicateNode', {
                    'node': this,
                    'clone': clone,
                    'parent': this.parent
                });
                break;
            case 'mouseover':
                this.setHighlight(true);
                break;
            case 'mouseout':
                this.setHighlight(false);
                break;
        }
    }


    var domRemove = dom.remove;
    if (target == domRemove) {
        switch (type) {
            case 'click':
                this._onRemove();
                break;
            case 'mouseover':
                this.setHighlight(true);
                break;
            case 'mouseout':
                this.setHighlight(false);
                break;
        }
    }


    var domType = dom.type;
    if (target == domType) {
        switch (type) {
            case 'click':
                this._onChangeType(event);
                break;
            case 'mouseover':
                this.setHighlight(true);
                break;
            case 'mouseout':
                this.setHighlight(false);
                break;
        }
    }



    var domTree = dom.tree;
    if (target == domTree.parentNode) {
        switch (type) {
            case 'click':
                var left = (event.offsetX != undefined) ? (event.offsetX < (this.getLevel() + 1) * 24) : (event.clientX < JSONEditor.getAbsoluteLeft(dom.tdSeparator));
                if (left || expandable) {

                    if (domField) {
                        JSONEditor.setEndOfContentEditable(domField);
                        domField.focus();
                    }
                } else {
                    if (domValue) {
                        JSONEditor.setEndOfContentEditable(domValue);
                        domValue.focus();
                    }
                }
                break;
        }
    }

    if ((target == dom.tdExpand && !expandable) || target == dom.tdField || target == dom.tdSeparator) {
        switch (type) {
            case 'click':
                if (domField) {
                    JSONEditor.setEndOfContentEditable(domField);
                    domField.focus();
                }
                break;
        }
    }
};


JSONEditor.Node.prototype._onExpand = function (event) {
    event = event || window.event;
    var recurse = event.ctrlKey;

    if (recurse) {

        var table = this.dom.tr.parentNode;
        var frame = table.parentNode;
        var scrollTop = frame.scrollTop;
        frame.removeChild(table);
    }

    if (this.expanded) {
        this.collapse(recurse);
    } else {
        this.expand(recurse);
    }

    if (recurse) {

        frame.appendChild(table);
        frame.scrollTop = scrollTop;
    }
};

JSONEditor.Node.types = [{
    'value': 'array',
    'className': 'jsoneditor-option-array',
    'title': '"array" 类型: 一个包含了有序值集合的数组.'
}, {
    'value': 'auto',
    'className': 'jsoneditor-option-auto',
    'title': '"auto" 类型: 节点类型将自动从值中获取, 可以是: string, number, boolean, 或者 null.'
}, {
    'value': 'object',
    'className': 'jsoneditor-option-object',
    'title': '"object" 类型: 对象包含了一些无序的键/值对.'
}, {
    'value': 'string',
    'className': 'jsoneditor-option-string',
    'title': '"string" 类型: 节点类型不从值中自动获取, 但永远返回 string.'
}];


JSONEditor.Node.prototype._createDomTypeButton = function () {
    var node = this;
    var domType = document.createElement('button');
    domType.className = 'jsoneditor-type-' + node.type;
    domType.title = '改变节点类型';

    return domType;
};


JSONEditor.Node.prototype._onRemove = function () {
    this.setHighlight(false);
    var index = this.parent.childs.indexOf(this);

    this.parent._remove(this);

    this.editor.onAction('removeNode', {
        'node': this,
        'parent': this.parent,
        'index': index
    });
};


JSONEditor.Node.prototype._onChangeType = function (event) {
    JSONEditor.Events.stopPropagation(event);

    var domType = this.dom.type;

    var node = this;
    var x = JSONEditor.getAbsoluteLeft(domType);
    var y = JSONEditor.getAbsoluteTop(domType) + domType.clientHeight;
    var callback = function (newType) {
        var oldType = node.type;
        node.changeType(newType);
        node.editor.onAction('changeType', {
            'node': node,
            'oldType': oldType,
            'newType': newType
        });
        domType.className = 'jsoneditor-type-' + node.type;
    };
    JSONEditor.showDropDownList({
        'x': x,
        'y': y,
        'node': node,
        'value': node.type,
        'values': JSONEditor.Node.types,
        'className': 'jsoneditor-select',
        'optionSelectedClassName': 'jsoneditor-option-selected',
        'optionClassName': 'jsoneditor-option',
        'callback': callback
    });
};


JSONEditor.showDropDownList = function (params) {
    var select = document.createElement('div');
    select.className = params.className || '';
    select.style.position = 'absolute';
    select.style.left = (params.x || 0) + 'px';
    select.style.top = (params.y || 0) + 'px';

    params.values.forEach(function (v) {
        var text = v.value || String(v);
        var className = 'jsoneditor-option';
        var selected = (text == params.value);
        if (selected) {
            className += ' ' + params.optionSelectedClassName;
        }
        var option = document.createElement('div');
        option.className = className;
        if (v.title) {
            option.title = v.title;
        }

        var divIcon = document.createElement('div');
        divIcon.className = (v.className || '');
        option.appendChild(divIcon);

        var divText = document.createElement('div');
        divText.className = 'jsoneditor-option-text';
        divText.innerHTML = '<div>' + text + '</div>';
        option.appendChild(divText);

        option.onmousedown = (function (value) {
            return function () {
                params.callback(value);
            };
        })(v.value);
        select.appendChild(option);
    });

    document.body.appendChild(select);
    params.node.setHighlight(true);
    JSONEditor.freezeHighlight = true;


    var onmousedown = JSONEditor.Events.addEventListener(document, 'mousedown', function () {
        JSONEditor.freezeHighlight = false;
        params.node.setHighlight(false);
        if (select && select.parentNode) {
            select.parentNode.removeChild(select);
        }
        JSONEditor.Events.removeEventListener(document, 'mousedown', onmousedown);
    });
    var onmousewheel = JSONEditor.Events.addEventListener(document, 'mousewheel', function () {
        JSONEditor.freezeHighlight = false;
        params.node.setHighlight(false);
        if (select && select.parentNode) {
            select.parentNode.removeChild(select);
        }
        JSONEditor.Events.removeEventListener(document, 'mousewheel', onmousewheel);
    });
};


JSONEditor.Node.prototype.getAppend = function () {
    if (!this.append) {
        this.append = new JSONEditor.AppendNode(this.editor);
        this.append.setParent(this);
    }
    return this.append.getDom();
};


JSONEditor.Node.prototype._createDomRemoveButton = function () {
    if (this.parent && (this.parent.type == 'array' || this.parent.type == 'object')) {
        var buttonRemove = document.createElement('button');
        buttonRemove.className = 'jsoneditor-remove';
        buttonRemove.title = '删除节点 (包括所有子节点)';

        return buttonRemove;
    } else {
        return undefined;
    }
};


JSONEditor.Node.prototype._createDomDuplicateButton = function () {
    if (this.parent && (this.parent.type == 'array' || this.parent.type == 'object')) {
        var buttonDupliate = document.createElement('button');
        buttonDupliate.className = 'jsoneditor-duplicate';
        buttonDupliate.title = '复制节点 (包括所有子节点)';

        return buttonDupliate;
    } else {
        return undefined;
    }
};


JSONEditor.Node.prototype._getType = function (value) {
    if (value instanceof Array) {
        return 'array';
    }
    if (value instanceof Object) {
        return 'object';
    }
    if (typeof (value) == 'string' && typeof (this._stringCast(value)) != 'string') {
        return 'string';
    }

    return 'auto';
};


JSONEditor.Node.prototype._stringCast = function (str) {
    var lower = str.toLowerCase(),
        num = Number(str),
        numFloat = parseFloat(str);

    if (str == '') {
        return '';
    } else if (lower == 'null') {
        return null;
    } else if (lower == 'true') {
        return true;
    } else if (lower == 'false') {
        return false;
    } else if (!isNaN(num) && !isNaN(numFloat)) {
        return num;
    } else {
        return str;
    }
};


JSONEditor.Node.prototype._escapeHTML = function (text) {
    var htmlEscaped = String(text)
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/  /g, '  ')
        .replace(/^ /, ' ')
        .replace(/ $/, ' ');

    var json = JSON.stringify(htmlEscaped);
    return json.substring(1, json.length - 1);
};


JSONEditor.Node.prototype._unescapeHTML = function (escapedText) {
    var json = '"' + this._escapeJSON(escapedText) + '"';
    var htmlEscaped = JSONEditor.parse(json);
    return htmlEscaped.replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/ /g, ' ');
};


JSONEditor.Node.prototype._escapeJSON = function (text) {

    var escaped = '';
    var i = 0,
        iMax = text.length;
    while (i < iMax) {
        var c = text.charAt(i);
        if (c == '\n') {
            escaped += '\\n';
        } else if (c == '\\') {
            escaped += c;
            i++;

            c = text.charAt(i);
            if ('"\\/bfnrtu'.indexOf(c) == -1) {
                escaped += '\\';
            }
            escaped += c;
        } else if (c == '"') {
            escaped += '\\"';
        } else {
            escaped += c;
        }
        i++;
    }

    return escaped;
};


JSONEditor.AppendNode = function (editor) {
    this.editor = editor;
    this.dom = {};
};

JSONEditor.AppendNode.prototype = new JSONEditor.Node();


JSONEditor.AppendNode.prototype.getDom = function () {
    if (this.dom.tr) {
        return this.dom.tr;
    }


    function newTd(className) {
        var td = document.createElement('td');
        td.className = className || '';
        return td;
    }


    var trAppend = document.createElement('tr');
    trAppend.node = this;


    if (!this.editor.editable) {
        return trAppend;
    }


    trAppend.appendChild(newTd('jsoneditor-td'));


    var tdAppend = document.createElement('td');
    trAppend.appendChild(tdAppend);
    tdAppend.className = 'jsoneditor-td';


    var buttonAppend = document.createElement('button');
    buttonAppend.className = 'jsoneditor-append';
    buttonAppend.title = '添加';
    this.dom.append = buttonAppend;
    tdAppend.appendChild(buttonAppend);

    trAppend.appendChild(newTd('jsoneditor-td jsoneditor-td-edit'));
    trAppend.appendChild(newTd('jsoneditor-td jsoneditor-td-edit'));
    trAppend.appendChild(newTd('jsoneditor-td jsoneditor-td-edit'));

    this.dom.tr = trAppend;
    this.dom.td = tdAppend;

    this.updateDom();

    return trAppend;
};


JSONEditor.AppendNode.prototype.updateDom = function () {
    var tdAppend = this.dom.td;
    if (tdAppend) {
        tdAppend.style.paddingLeft = (this.getLevel() * 24 + 26) + 'px';

    }
};


JSONEditor.AppendNode.prototype.onEvent = function (event) {
    var type = event.type;
    var target = event.target || event.srcElement;
    var dom = this.dom;

    var domAppend = dom.append;
    if (target == domAppend) {
        switch (type) {
            case 'click':
                this._onAppend();
                break;

            case 'mouseover':
                this.parent.setHighlight(true);
                break;

            case 'mouseout':
                this.parent.setHighlight(false);
        }
    }
};


JSONEditor.AppendNode.prototype._onAppend = function () {
    var newNode = new JSONEditor.Node(this.editor, {
        'field': 'field',
        'value': 'value'
    });
    this.parent.appendChild(newNode);
    this.parent.setHighlight(false);
    newNode.focus();

    this.editor.onAction('appendNode', {
        'node': newNode,
        'parent': this.parent
    });
};


JSONEditor.prototype._createFrame = function () {

    this.container.innerHTML = '';
    this.frame = document.createElement('div');
    this.frame.className = 'jsoneditor-frame';
    this.container.appendChild(this.frame);


    var editor = this;

    var onEvent = function (event) {
        event = event || window.event;
        var target = event.target || event.srcElement;



        var node = JSONEditor.getNodeFromTarget(target);
        if (node) {
            node.onEvent(event);
        }
    };
    this.frame.onclick = function (event) {
        onEvent(event);


        JSONEditor.Events.preventDefault(event);
    };
    this.frame.onchange = onEvent;
    this.frame.onkeydown = onEvent;
    this.frame.onkeyup = onEvent;
    this.frame.oncut = onEvent;
    this.frame.onpaste = onEvent;
    this.frame.onmousedown = onEvent;
    this.frame.onmouseup = onEvent;
    this.frame.onmouseover = onEvent;
    this.frame.onmouseout = onEvent;



    JSONEditor.Events.addEventListener(this.frame, 'focus', onEvent, true);
    JSONEditor.Events.addEventListener(this.frame, 'blur', onEvent, true);
    this.frame.onfocusin = onEvent;
    this.frame.onfocusout = onEvent;


    this.menu = document.createElement('div');
    this.menu.className = 'jsoneditor-menu Jsmenu03';
    this.frame.appendChild(this.menu);


    var expandAll = document.createElement('input');
    expandAll.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-expand-all mr10';
    expandAll.value = '展开';
    expandAll.type = "button";
    expandAll.title = '展开所有元素';
    expandAll.onclick = function () {
        editor.expandAll();
    };
    this.menu.appendChild(expandAll);


    var collapseAll = document.createElement('input');
    collapseAll.value = '折叠';
    collapseAll.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-collapse-all mr10';
    collapseAll.type = "button";
    collapseAll.title = '折叠所有元素';
    collapseAll.onclick = function () {
        editor.collapseAll();
    };
    this.menu.appendChild(collapseAll);

    var tojsonsave = document.createElement('input');
    tojsonsave.id = '2jsonsave';
    tojsonsave.value = '保存';
    tojsonsave.title = '修改结果会保存到下方的textarea中';
    tojsonsave.className = 'layui-btn layui-btn-primary GLOkBtn mr10 convert-left';
    tojsonsave.type = "button";
    tojsonsave.onclick = function () {
        this.focus();
        // app.editorToFormatter();
        app.editorToResults();
    };
    this.menu.appendChild(tojsonsave);

    if (this.history) {

        var separator = document.createElement('span');
        separator.innerHTML = ' ';
        this.menu.appendChild(separator);


        var undo = document.createElement('input');
        undo.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-undo mr10';
        undo.value = '撤销';
        undo.type = "button";
        undo.title = '';
        undo.onclick = function () {

            editor.history.undo();


            if (editor.options.change) {
                editor.options.change();
            }
        };
        this.menu.appendChild(undo);
        this.dom.undo = undo;


        var redo = document.createElement('input');
        redo.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-redo mr10';
        redo.value = '重做';
        redo.type = "button";
        redo.title = '恢复被撤销的结果';
        redo.onclick = function () {
            editor.history.redo();
            if (editor.options.change) {
                editor.options.change();
            }
        };
        this.menu.appendChild(redo);
        this.dom.redo = redo;


        this.history.onChange = function () {
            var undo_b = !editor.history.canUndo()
            undo.disabled = undo_b;
            undo.className = undo_b ? 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-undo mr10 disabled' : 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-undo mr10';

            var redo_b = !editor.history.canRedo();
            redo.disabled = redo_b;
            redo.className = redo_b ? 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-redo mr10 disabled' : 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-redo mr10';
        };
        this.history.onChange();
    }


    if (this.options.search) {
        this.searchBox = new JSONEditor.SearchBox(this, this.menu);
    }
};

JSONEditor.prototype._createTable = function () {
    var contentOuter = document.createElement('div');
    contentOuter.className = 'jsoneditor-content-outer';
    this.contentOuter = contentOuter;

    this.content = document.createElement('div');
    this.content.className = 'jsoneditor-content';
    this.content.title = '这是JSON的编辑区域。';
    contentOuter.appendChild(this.content);

    this.table = document.createElement('table');
    this.table.className = 'jsoneditor-table';
    this.content.appendChild(this.table);



    var ieVersion = JSONEditor.getInternetExplorerVersion();
    if (ieVersion == 8) {
        this.content.style.overflow = 'scroll';
    }



    var col;
    this.colgroupContent = document.createElement('colgroup');
    col = document.createElement('col');
    col.width = "24px";
    this.colgroupContent.appendChild(col);
    col = document.createElement('col');
    this.colgroupContent.appendChild(col);
    col = document.createElement('col');
    col.width = "24px";
    this.colgroupContent.appendChild(col);
    col = document.createElement('col');
    col.width = "24px";
    this.colgroupContent.appendChild(col);
    col = document.createElement('col');
    col.width = "24px";
    this.colgroupContent.appendChild(col);
    this.table.appendChild(this.colgroupContent);

    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);

    this.frame.appendChild(contentOuter);
};


JSONEditor.getNodeFromTarget = function (target) {
    while (target) {
        if (target.node) {
            return target.node;
        }
        target = target.parentNode;
    }

    return undefined;
};


JSONFormatter = function (container, options, json) {

    if (!JSON) {
        throw new Error('您当前使用的浏览器不支持 JSON. \n\n' +
            '请下载安装最新版本的浏览器, 本站推荐Google Chrome.\n' +
            '(PS: 当前主流浏览器都支持JSON).');
    }

    this.container = container;
    this.indentation = 4;

    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.frame = document.createElement('div');
    this.frame.className = "jsoneditor-frame";
    this.frame.onclick = function (event) {

        JSONEditor.Events.preventDefault(event);
    };


    this.menu = document.createElement('div');
    this.menu.className = 'jsoneditor-menu Jsmenu03';
    this.frame.appendChild(this.menu);

    var buttonFormat = document.createElement('input');

    buttonFormat.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-format';
    buttonFormat.value = '格式化JSON';
    buttonFormat.type = "button";

    this.menu.appendChild(buttonFormat);



    var buttonCompact = document.createElement('input');

    buttonCompact.className = 'layui-btn layui-btn-primary jsoneditor-menu jsoneditor-compact';
    buttonCompact.value = '压缩JSON';
    buttonCompact.type = "button";

    this.menu.appendChild(buttonCompact);


    var tojsonformat = document.createElement('input');
    tojsonformat.id = '2jsonformat';
    tojsonformat.value = '解析JSON';
    tojsonformat.className = 'layui-btn layui-btn-primary GLOkBtn mr10 convert-right';
    tojsonformat.type = "button";
    tojsonformat.onclick = function () {
        this.focus();
        app.formatterToEditor();
    };
    this.menu.appendChild(tojsonformat);


    this.content = document.createElement('div');
    this.content.className = 'jsonformatter-content';
    this.content.title = '请在这里粘贴JSON代码.';
    this.frame.appendChild(this.content);

    this.textarea = document.createElement('textarea');
    this.textarea.className = "jsonformatter-textarea";
    this.textarea.spellcheck = false;
    this.content.appendChild(this.textarea);

    var textarea = this.textarea;


    if (options) {
        if (options.change) {

            if (this.textarea.oninput === null) {
                this.textarea.oninput = function () {
                    options.change();
                }
            } else {

                this.textarea.onchange = function () {
                    options.change();
                }
            }
        }
        if (options.indentation) {
            this.indentation = Number(options.indentation);
        }
    }

    var me = this;
    buttonFormat.onclick = function () {
        try {
            var json = JSONEditor.parse(textarea.value);
            textarea.value = JSON.stringify(json, null, me.indentation);
        } catch (err) {
            me.onError(err);
        }
    };
    buttonCompact.onclick = function () {
        try {
            var json = JSONEditor.parse(textarea.value);
            textarea.value = JSON.stringify(json);
        } catch (err) {
            me.onError(err);
        }
    };

    this.container.appendChild(this.frame);


    if (typeof (json) == 'string') {
        this.setText(json);
    } else {
        this.set(json);
    }
};


JSONFormatter.prototype.onError = function (err) {

};


JSONFormatter.prototype.set = function (json) {
    this.textarea.value = JSON.stringify(json, null, this.indentation);
};


JSONFormatter.prototype.get = function () {
    return JSONEditor.parse(this.textarea.value);
};


JSONFormatter.prototype.getText = function () {
    return this.textarea.value;
};


JSONFormatter.prototype.setText = function (text) {
    this.textarea.value = text;
};


JSONEditor.SearchBox = function (editor, container) {
    var searchBox = this;

    this.editor = editor;
    this.timeout = undefined;
    this.delay = 200;
    this.lastText = undefined;

    this.dom = {};
    this.dom.container = container;

    var table = document.createElement('table');
    this.dom.table = table;
    table.className = 'jsoneditor-search';
    container.appendChild(table);
    var tbody = document.createElement('tbody');
    this.dom.tbody = tbody;
    table.appendChild(tbody);
    var tr = document.createElement('tr');
    tbody.appendChild(tr);

    var td = document.createElement('td');
    td.className = 'jsoneditor-search';
    tr.appendChild(td);
    var results = document.createElement('div');
    this.dom.results = results;
    results.className = 'jsoneditor-search-results';
    td.appendChild(results);

    td = document.createElement('td');
    td.className = 'jsoneditor-search';
    tr.appendChild(td);
    var divInput = document.createElement('div');
    this.dom.input = divInput;
    divInput.className = 'jsoneditor-search';
    divInput.title = '查找区块和值';
    td.appendChild(divInput);


    var tableInput = document.createElement('table');
    tableInput.className = 'jsoneditor-search-input';
    divInput.appendChild(tableInput);
    var tbodySearch = document.createElement('tbody');
    tableInput.appendChild(tbodySearch);
    tr = document.createElement('tr');
    tbodySearch.appendChild(tr);

    var refreshSearch = document.createElement('button');
    refreshSearch.className = 'jsoneditor-search-refresh';
    td = document.createElement('td');
    td.appendChild(refreshSearch);
    tr.appendChild(td);

    var search = document.createElement('input');
    this.dom.search = search;
    search.className = 'jsoneditor-search';
    search.oninput = function (event) {
        searchBox.onDelayedSearch(event);
    };
    search.onchange = function (event) {
        searchBox.onSearch(event);
    };
    search.onkeydown = function (event) {
        searchBox.onKeyDown(event);
    };
    search.onkeyup = function (event) {
        searchBox.onKeyUp(event);
    };
    refreshSearch.onclick = function (event) {
        search.select();
    };


    td = document.createElement('td');
    td.appendChild(search);
    tr.appendChild(td);

    var searchNext = document.createElement('button');
    searchNext.title = '下一个 (Enter)';
    searchNext.className = 'jsoneditor-search-next';
    searchNext.onclick = function () {
        searchBox.next();
    };
    td = document.createElement('td');
    td.appendChild(searchNext);
    tr.appendChild(td);

    var searchPrevious = document.createElement('button');
    searchPrevious.title = '上一个 (Shift+Enter)';
    searchPrevious.className = 'jsoneditor-search-previous';
    searchPrevious.onclick = function () {
        searchBox.previous();
    };
    td = document.createElement('td');
    td.appendChild(searchPrevious);
    tr.appendChild(td);

};


JSONEditor.SearchBox.prototype.next = function () {
    if (this.results != undefined) {
        var index = (this.resultIndex != undefined) ? this.resultIndex + 1 : 0;
        if (index > this.results.length - 1) {
            index = 0;
        }
        this.setActiveResult(index);
    }
};


JSONEditor.SearchBox.prototype.previous = function () {
    if (this.results != undefined) {
        var max = this.results.length - 1;
        var index = (this.resultIndex != undefined) ? this.resultIndex - 1 : max;
        if (index < 0) {
            index = max;
        }
        this.setActiveResult(index);
    }
};


JSONEditor.SearchBox.prototype.setActiveResult = function (index) {

    if (this.activeResult) {
        var prevNode = this.activeResult.node;
        var prevElem = this.activeResult.elem;
        if (prevElem == 'field') {
            delete prevNode.searchFieldActive;
        } else {
            delete prevNode.searchValueActive;
        }
        prevNode.updateDom();
    }

    if (!this.results || !this.results[index]) {

        this.resultIndex = undefined;
        this.activeResult = undefined;
        return;
    }

    this.resultIndex = index;


    var node = this.results[this.resultIndex].node;
    var elem = this.results[this.resultIndex].elem;
    if (elem == 'field') {
        node.searchFieldActive = true;
    } else {
        node.searchValueActive = true;
    }
    this.activeResult = this.results[this.resultIndex];
    node.updateDom();

    node.scrollTo();
};


JSONEditor.SearchBox.prototype.focusActiveResult = function () {
    if (!this.activeResult) {
        this.next();
    }

    if (this.activeResult) {
        this.activeResult.node.focus(this.activeResult.elem);
    }
};


JSONEditor.SearchBox.prototype.clearDelay = function () {
    if (this.timeout != undefined) {
        clearTimeout(this.timeout);
        delete this.timeout;
    }
};


JSONEditor.SearchBox.prototype.onDelayedSearch = function (event) {


    this.clearDelay();
    var searchBox = this;
    this.timeout = setTimeout(function (event) {
        searchBox.onSearch(event);
    },
        this.delay);
};


JSONEditor.SearchBox.prototype.onSearch = function (event, forceSearch) {
    this.clearDelay();

    var value = this.dom.search.value;
    var text = (value.length > 0) ? value : undefined;
    if (text != this.lastText || forceSearch) {

        this.lastText = text;
        this.results = this.editor.search(text);
        this.setActiveResult(undefined);


        if (text != undefined) {
            var resultCount = this.results.length;
            switch (resultCount) {
                case 0:
                    this.dom.results.innerHTML = '区块/值未找到';
                    this.dom.results.style.color = '#ff0000';
                    break;
                default:
                    this.dom.results.innerHTML = '找到' + resultCount + '个结果';
                    this.dom.results.style.color = '#228b22';
                    break;
            }
        } else {
            this.dom.results.innerHTML = '';
        }
    }
};


JSONEditor.SearchBox.prototype.onKeyDown = function (event) {
    event = event || window.event;
    var keynum = event.which || event.keyCode;
    if (keynum == 27) {
        this.dom.search.value = '';
        this.onSearch(event);
        JSONEditor.Events.preventDefault(event);
        JSONEditor.Events.stopPropagation(event);
    } else if (keynum == 13) {
        if (event.ctrlKey) {

            this.onSearch(event, true);
        } else if (event.shiftKey) {

            this.previous();
        } else {

            this.next();
        }
        JSONEditor.Events.preventDefault(event);
        JSONEditor.Events.stopPropagation(event);
    }
};


JSONEditor.SearchBox.prototype.onKeyUp = function (event) {
    event = event || window.event;
    var keynum = event.which || event.keyCode;
    if (keynum != 27 && keynum != 13) {
        this.onDelayedSearch(event);
    }
};


JSONEditor.Events = {};


JSONEditor.Events.addEventListener = function (element, action, listener, useCapture) {
    if (element.addEventListener) {
        if (useCapture === undefined) useCapture = false;

        if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
            action = "DOMMouseScroll";
        }

        element.addEventListener(action, listener, useCapture);
        return listener;
    } else {

        var f = function () {
            return listener.call(element, window.event);
        };
        element.attachEvent("on" + action, f);
        return f;
    }
};


JSONEditor.Events.removeEventListener = function (element, action, listener, useCapture) {
    if (element.removeEventListener) {

        if (useCapture === undefined) useCapture = false;

        if (action === "mousewheel" && navigator.userAgent.indexOf("Firefox") >= 0) {
            action = "DOMMouseScroll";
        }

        element.removeEventListener(action, listener, useCapture);
    } else {

        element.detachEvent("on" + action, listener);
    }
};



JSONEditor.Events.stopPropagation = function (event) {
    if (!event) event = window.event;

    if (event.stopPropagation) {
        event.stopPropagation();
    } else {
        event.cancelBubble = true;
    }
};



JSONEditor.Events.preventDefault = function (event) {
    if (!event) event = window.event;

    if (event.preventDefault) {
        event.preventDefault();
    } else {
        event.returnValue = false;
    }
};




JSONEditor.getAbsoluteLeft = function (elem) {
    var left = 0;
    var body = document.body;
    while (elem != null && elem != body) {
        left += elem.offsetLeft;
        left -= elem.scrollLeft;
        elem = elem.offsetParent;
    }
    return left;
};


JSONEditor.getAbsoluteTop = function (elem) {
    var top = 0;
    var body = document.body;
    while (elem != null && elem != body) {
        top += elem.offsetTop;
        top -= elem.scrollTop;
        elem = elem.offsetParent;
    }
    return top;
};


JSONEditor.addClassName = function (elem, className) {
    var classes = elem.className.split(' ');
    if (classes.indexOf(className) == -1) {
        classes.push(className);
        elem.className = classes.join(' ');
    }
};


JSONEditor.removeClassName = function (elem, className) {
    var classes = elem.className.split(' ');
    var index = classes.indexOf(className);
    if (index != -1) {
        classes.splice(index, 1);
        elem.className = classes.join(' ');
    }
};


JSONEditor.stripFormatting = function (divElement) {
    var childs = divElement.childNodes;
    for (var i = 0, iMax = childs.length; i < iMax; i++) {
        var child = childs[i];


        if (child.style) {

            child.removeAttribute('style');
        }


        var attributes = child.attributes;
        if (attributes) {
            for (var j = attributes.length - 1; j >= 0; j--) {
                var attribute = attributes[j];
                if (attribute.specified == true) {
                    child.removeAttribute(attribute.name);
                }
            }
        }


        JSONEditor.stripFormatting(child);
    }
};


JSONEditor.setEndOfContentEditable = function (contentEditableElement) {
    var range, selection;
    if (document.createRange) {
        range = document.createRange();
        range.selectNodeContents(contentEditableElement);
        range.collapse(false);
        selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (document.selection) {
        range = document.body.createTextRange();
        range.moveToElementText(contentEditableElement);
        range.collapse(false);
        range.select();
    }
};


JSONEditor.getInnerText = function (element, buffer) {
    var first = (buffer == undefined);
    if (first) {
        buffer = {
            'text': '',
            'flush': function () {
                var text = this.text;
                this.text = '';
                return text;
            },
            'set': function (text) {
                this.text = text;
            }
        };
    }


    if (element.nodeValue) {
        return buffer.flush() + element.nodeValue;
    }


    if (element.hasChildNodes()) {
        var childNodes = element.childNodes;
        var innerText = '';

        for (var i = 0, iMax = childNodes.length; i < iMax; i++) {
            var child = childNodes[i];

            if (child.nodeName == 'DIV' || child.nodeName == 'P') {
                var prevChild = childNodes[i - 1];
                var prevName = prevChild ? prevChild.nodeName : undefined;
                if (prevName && prevName != 'DIV' && prevName != 'P' && prevName != 'BR') {
                    innerText += '\n';
                    buffer.flush();
                }
                innerText += JSONEditor.getInnerText(child, buffer);
                buffer.set('\n');
            } else if (child.nodeName == 'BR') {
                innerText += buffer.flush();
                buffer.set('\n');
            } else {
                innerText += JSONEditor.getInnerText(child, buffer);
            }
        }

        return innerText;
    } else {
        if (element.nodeName == 'P' && JSONEditor.getInternetExplorerVersion() != -1) {





            return buffer.flush();
        }
    }


    return '';
};


JSONEditor._ieVersion = undefined;
JSONEditor.getInternetExplorerVersion = function () {
    if (JSONEditor._ieVersion == undefined) {
        var rv = -1;
        if (navigator.appName == 'Microsoft Internet Explorer') {
            var ua = navigator.userAgent;
            var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        }

        JSONEditor._ieVersion = rv;
    }

    return JSONEditor._ieVersion;
};

JSONEditor.ieVersion = JSONEditor.getInternetExplorerVersion();


JSONEditor.parse = function (jsonString) {
    try {
        if (isStrict)
            return JSON.parse(jsonString); //严格模式
        else
            return eval("(" + jsonString + ")"); //非严格模式
    } catch (err) {

        var message = JSONEditor.validate(jsonString) || err;
        throw new Error(message);
    }
};


JSONEditor.validate = function (jsonString) {
    var message = undefined;

    try {
        if (window.jsonlint) {
            window.jsonlint.parse(jsonString);
        } else {
            if (isStrict)
                JSON.parse(jsonString);
            else
                eval("(" + jsonString + ")");
        }
    } catch (err) {
        layer.msg("呃，你干嘛呢？", so.defn);
    }

    return message;
};
