
JSONResults = function (container, options, json) {

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


    this.content = document.createElement('div');
    this.content.className = 'jsonresults-content';
    this.content.title = '这是修改后的JSON。';
    this.frame.appendChild(this.content);

    this.textarea = document.createElement('textarea');
    this.textarea.className = "jsonresults-textarea";
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


JSONResults.prototype.onError = function (err) {

};


JSONResults.prototype.set = function (json) {
    this.textarea.value = JSON.stringify(json, null, this.indentation);
};


JSONResults.prototype.get = function () {
    return JSONEditor.parse(this.textarea.value);
};


JSONResults.prototype.getText = function () {
    return this.textarea.value;
};


JSONResults.prototype.setText = function (text) {
    this.textarea.value = text;
};
