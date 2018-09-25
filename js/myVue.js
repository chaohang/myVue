/**
 * 数据监听器，为数据添加监听
 */
objServer = (data) => {
    if (data && typeof data !== 'object') {
        return;
    }
    Object.keys(data).forEach(key => {  //  相比for-in，Object.key()方法只返回本自身属性，不会返回构造函数属性和原型链属性
        makDefineProp(data, key, data[key]);
    })
}
// 为数据添加数据监控，重写每个监听数据的get set事件
makDefineProp = (data, key, value) => {
    objServer(value);
    var dep = new Dep();
    Object.defineProperty(data, key, {
        configurable: true, // 可修改
        enumerable: true,// 可枚举
        get: () => {
            if (Dep.target) {  // 在初始化时 在订阅器中加入订阅者
                dep.addSub(Dep.target);
            }
            return value;
        },
        set: (newVal) => { // 在改变时 通知所有订阅者
            if (value === newVal) {
                return;
            }
            value = newVal;
            dep.notify();
        }
    })
}


/**
 * 订阅器，为用到该对象的地方添加订阅，当对象改变，通知所有订阅者
 */
function Dep() {
    this.subs = [];
}

Dep.prototype = {
    addSub: function (sub) { // 添加订阅者
        this.subs.push(sub);
    },
    notify: function () { // 通知所有订阅者
        this.subs.forEach(sub => {
            sub.update();
        });
    }
}
Dep.target = null;

/**
 * 监听器  
 */
function Watcher(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;
    this.value = this.get();
}
Watcher.prototype = {
    update: function () {
        var value = this.vm.data[this.key];
        var oldVal = this.value;
        if (value != oldVal) {
            this.value = value;
            this.callback.call(this.vm, value, oldVal)
        }
    },
    get: function () {
        Dep.target = this; // 存储自己
        var value = this.vm.data[this.key]; // 执行监听器中的get函数
        Dep.target = null; // 释放自己
        return value;
    }
}
//处理函数
function Compile(el, vm) {
    this.el = document.querySelector(el);
    this.vm = vm;
    this.fargment = null;
    this.init();// 初始化
}
Compile.prototype = {
    init: function () {// 创建DOM，替换DOM
        this.fargment = this.fargmentNode(this.el);
        this.elementCompile(this.fargment);
        this.el.appendChild(this.fargment);
    },
    fargmentNode(node) {
        var fargment = document.createDocumentFragment();
        var child = node.firstChild;
        while (child) {
            fargment.appendChild(child);
            child = node.firstChild;
        }
        return fargment;
    },
    textCompile: function (node, key) {
        var self = this;
        this.updateText(node, this.vm[key]);
        new Watcher(this.vm, key, function (value) {
            self.updateText(node, value);
        })
    },
    elementCompile: function (el) {
        var childNodes = el.childNodes;
        var self = this;
        [].slice.call(childNodes).forEach(function (node) {
            var reg = /\{\{(.*)\}\}/;
            /**
             * innerText ： 当前节点下的内容
             * textContent ：当前节点下和子节点下所有的内容
             */
            var text = node.textContent;
            if (node.nodeType === 1) {
                self.eveAndModel(node);
            } else if (node.nodeType === 3 && reg.test(text)) {
                self.textCompile(node, reg.exec(text)[1])
            }

            if (node.childNodes && node.childNodes.length) {
                self.elementCompile(node);
            }
        })
    },
    eveAndModel: function (node) {
        var nodeAttrs = node.attributes;
        var self = this;
        [].slice.call(nodeAttrs).forEach(function (attr) {
            var attrName = attr.name;
            if (attrName.indexOf('v-') === 0) {
                var value = attr.value;
                var key = attrName.substring(2);
                if (self.isEvent(key)) {
                    self.eventCompile(node, key, value);
                } else {
                    self.modelCompile(node, key, value);
                }
                node.removeAttribute(attrName);
            }
        })
    },
    eventCompile: function (node, key, methodKey) {
        var eve = key.split(':')[1];
        var callback = this.vm.methods && this.vm.methods[methodKey];
        if (eve && callback) {
            node.addEventListener(eve, callback.bind(this.vm), true);
        }
    },
    modelCompile: function (node, key, dataKey) {
        var self = this;
        var val = this.vm[dataKey];
        this.updateModel(node, val);
        new Watcher(this.vm, dataKey, function (value) {
            self.updateModel(node, value);
        })
        var tagName = node.tagName && node.tagName.toLowerCase();
        var event = 'change'
        if (tagName === 'input') {
            event = 'input';
        }
        node.addEventListener(event, function (e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            val = newValue;
            self.vm[dataKey] = newValue;
        })
    },
    updateText: function (node, value) {
        node.textContent = value == undefined ? '' : value;
    },
    updateModel: function (node, value) {
        node.value = value == undefined ? '' : value;
    },
    isEvent: function (key) {
        return key.indexOf('on:') === 0;
    }
}
/**
 * 初始化
 */
function MyVue(options) {
    this.data = options.data;
    var self = this;
    this.methods = options.methods;
    Object.keys(this.data).forEach(key => {
        self.proxyKeys(key);
    });
    objServer(this.data);
    new Compile(options.el, this);
    options.mounted.call(this);
}

MyVue.prototype = {
    proxyKeys: function (key) {
        var that = this;
        Object.defineProperty(this, key, {
            enumerable: true,
            configurable: true,
            get: function proxyGetter() {
                return that.data[key];
            },
            set: function proxySetter(newVal) {
                that.data[key] = newVal;
            }
        })
    }
}