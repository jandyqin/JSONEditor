
//Splitter
function Splitter(params) {
    if (!params || !params.container) {
        throw new Error('params.container undefined in Splitter constructor')
    }
    var me = this;
    JSONEditor.Events.addEventListener(params.container, "mousedown",
        function (event) {
            me.onMouseDown(event)
        });
    this.isxy = params.isxy;
    this.container = params.container;
    this.onChange = (params.change) ? params.change : function () { };
    this.params = {}
}
Splitter.prototype.onMouseDown = function (event) {
    var me = this;
    var leftButtonDown = event.which ? (event.which == 1) : (event.button == 1);
    if (!leftButtonDown) {
        return
    }
    if (!this.params.mousedown) {
        this.params.mousedown = true;
        this.params.mousemove = JSONEditor.Events.addEventListener(document, 'mousemove',
            function (event) {
                me.onMouseMove(event)
            });
        this.params.mouseup = JSONEditor.Events.addEventListener(document, 'mouseup',
            function (event) {
                me.onMouseUp(event)
            });
        this.params.screenY = event.screenY;
        this.params.screenX = event.screenX;
        this.params.value = this.getValue()
    }
    JSONEditor.Events.preventDefault(event)
};
Splitter.prototype.onMouseMove = function (event) {
    var diff, value;
    if (this.isxy == "y") {
        var height = (window.innerHeight || document.body.offsetHeight || document.documentElement.offsetHeight);
        diff = event.screenY - this.params.screenY;
        value = this.params.value + diff / height
    } else {
        var width = (window.innerWidth || document.body.offsetWidth || document.documentElement.offsetWidth);
        diff = event.screenX - this.params.screenX;
        value = this.params.value + diff / width
    }
    value = this.setValue(value);
    this.onChange(value);
    JSONEditor.Events.preventDefault(event)
};
Splitter.prototype.onMouseUp = function (event) {
    if (this.params.mousedown) {
        JSONEditor.Events.removeEventListener(document, 'mousemove', this.params.mousemove);
        JSONEditor.Events.removeEventListener(document, 'mouseup', this.params.mouseup);
        this.params.mousemove = undefined;
        this.params.mouseup = undefined;
        this.params.mousedown = false
    }
    JSONEditor.Events.preventDefault(event)
};
Splitter.prototype.setValue = function (value) {
    value = Number(value);
    if (value < 0.1) {
        value = 0.1
    }
    if (value > 0.9) {
        value = 0.9
    }
    this.value = value;
    return value
};
Splitter.prototype.getValue = function () {
    var value = this.value;
    if (value == undefined) {
        value = this.setValue(0.5)
    }
    return value
};

var editor = null;
var formatter = null;
var results = null;
var app = {};
app.isxy = "y";/*左右(x)/上下(y)可拉伸*/
app.formatterToEditor = function () {
    try {
        editor.set(formatter.get());
    } catch (err) {
        alert("请检查JSON格式是否正确。");
    }
};
app.editorToFormatter = function () {
    try {
        formatter.set(editor.get());
    } catch (err) {
        alert("请检查JSON格式是否正确。");
    }
};
app.editorToResults = function () {
    try {
        results.set(editor.get());
    } catch (error) {
        alert("请检查JSON格式是否正确。");
    }
}


app.load = function () {
    try {
        var json = { "name": "JSONEditor", "describe": { "name": "编辑JSON视图", "function": ["JSON压缩", "JSON格式化", "JSON解析", "JSON展开", "JSON折叠", "JSON修改", "JSON排序"] }, "address": { "city": "深圳", "country": "中国" }, "author_list": [{ "name": "覃沭恿" }, { "name": "何彬英" }, { "name": "陈俊琦" }] };
        app.lastChanged = undefined;
        $(".JsonW").show();
        $("#splitter,#splitter1,#splitter2").show();
        var container = document.getElementById("jsonformatter");
        formatter = new JSONFormatter(container, {
            change: function () {
                app.lastChanged = formatter;
            }
        });
        formatter.set(json);
        formatter.onError = function (err) {
            alert("请检查JSON格式是否正确。");
        };
        container = document.getElementById("jsoneditor");
        editor = new JSONEditor(container, {
            change: function () {
                app.lastChanged = editor;
            },
            isStrict: false//是否在严格模式校验JSON
        });
        editor.set(json);
        container = document.getElementById("jsonresults");
        results = new JSONResults(container, {
            change: function () {
                app.lastChanged = results;
            },
            isStrict: false//是否在严格模式校验JSON
        });
        results.set({ name: 'jsonresults', describe: '展示修改后的JSON。' });
        var domSplitter = document.getElementById('splitter');
        var domSplitter1 = document.getElementById('splitter1');
        var domSplitter2 = document.getElementById('splitter2');
        app.splitter = new Splitter({
            container: domSplitter,
            change: function () {
                app.resize();
            },
            isxy: app.isxy
        });
        app.splitter1 = new Splitter({
            container: domSplitter1,
            change: function () {
                app.resize();
            },
            isxy: app.isxy
        });
        app.splitter2 = new Splitter({
            container: domSplitter2,
            change: function () {
                app.resize();
            },
            isxy: app.isxy
        });
        JSONEditor.Events.addEventListener(window, 'resize', app.resize);
        document.body.spellcheck = false;
    } catch (err) {
        alert("请检查JSON格式是否正确。");
        $(".JsonW").hide();
    }
};
app.openCallback = function (err, data) {
    if (!err) {
        if (data != undefined) {
            formatter.setText(data);
            try {
                var json = JSONEditor.parse(data);
                editor.set(json);
            } catch (err) {
                editor.set({});
                alert("请检查JSON格式是否正确。");
            }
        }
    } else {
        alert("请检查JSON格式是否正确。");
    }
};
app.resize = function () {
    try {
        var domEditor = document.getElementById('jsoneditor');
        var domFormatter = document.getElementById('jsonformatter');
        var domResults = document.getElementById('jsonresults');
        var width = window.innerWidth || document.body.offsetWidth || document.documentElement.offsetWidth;
        var height = window.innerHeight || document.body.offsetHeight || document.documentElement.offsetHeight;
        if (app.isxy == "y") {
            var splitterTop = height * app.splitter.getValue();
            var splitterTop1 = height * app.splitter1.getValue();
            var splitterTop2 = height * app.splitter2.getValue();
            domFormatter.style.height = Math.round(splitterTop) + 'px';
            domEditor.style.height = Math.round(splitterTop1) + 'px';
            domResults.style.height = Math.round(splitterTop2) + 'px';
        } else {
            var splitterLeft = width * app.splitter.getValue();
            domFormatter.style.width = Math.round(splitterLeft) + 'px';
        }
    } catch (e) {

    }
};
