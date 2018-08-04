'use strict';
require('es6-promise').polyfill();
require('canvas-text-metrics-polyfill');
require('whatwg-fetch');
require('blueimp-canvas-to-blob');

var $ = require('jquery');
var figlet = require('figlet');
var knockout = require('knockout');
var flfs = require('./flfs.js');
var bootstrap = require('bootstrap');
var slider = require('bootstrap-slider');
var filesaver = require('file-saver');
var iro = require('iro');
var dateformat = require('dateformat');
iro.Color.useHsv = true;

const space = ' ';

knockout.bindingHandlers.slider = {
  init: function(element, accessor, bindings, viewmodel, context) {
    var ob = accessor();
    if (!knockout.isObservable(ob))
      return;
    $(element).on('slide', function(e) {
      ob(e.value);
    }).on('change', function(e) {
      ob(e.value.newValue);
    });
  },
  update: function(element, accessor, bindings, viewmodel, context) {
    var ob = accessor();
    if (!knockout.isObservable(ob))
      return;
    $(element).slider('setValue', ob());
  }
};

var canvas;
var viewmodel = {};
viewmodel.fgvalue = knockout.observable(100);
viewmodel.fgvalue.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.fghue = knockout.observable(180);
viewmodel.fghue.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.fgsaturation = knockout.observable(80);
viewmodel.fgsaturation.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.bgvalue = knockout.observable(0);
viewmodel.bgvalue.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.bghue = knockout.observable(0);
viewmodel.bghue.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.bgsaturation = knockout.observable(0);
viewmodel.bgsaturation.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.randomquality = knockout.observable(8);
viewmodel.randomquality.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.randomrange = knockout.observable([0.1, 0.4]);
viewmodel.randomrange.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.flfs = knockout.observableArray(Object.getOwnPropertyNames(flfs));
viewmodel.logo = knockout.observable('');
viewmodel.flfurl = knockout.observable('');
viewmodel.flfauthor = knockout.observable('');
viewmodel.flfdate = knockout.observable('');
viewmodel.flfname = knockout.observable('slant');
viewmodel.flfname.subscribe(function(newval){
  viewmodel.updateflf();
  viewmodel.generate();
});
viewmodel.fontfamily = knockout.observable('EmbedOCRA');
viewmodel.fontfamily.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.fontsize = knockout.observable(18);
viewmodel.fontsize.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.text = knockout.observable('WTTL Generator');
viewmodel.text.subscribe(function(newval){
  viewmodel.generate();
});
viewmodel.generate = function() {
  figlet.text(viewmodel.text(), { font: viewmodel.flfname() },
    function(err, data) {
      if (err) {
        console.log("figlet: ", err);
        return;
      }
      var packoptions = {
        fontfamily: viewmodel.fontfamily(),
        fontsize: parseFloat(viewmodel.fontsize()),
        bgcolor: viewmodel.getcolor('bg').css('hex'),
        fgcolor: viewmodel.getcolor('fg').css('hex'),
        randomquality: viewmodel.randomquality(),
        randomrange: viewmodel.randomrange(),
      };
      draw(canvas, pack(canvas, data, packoptions));
    });
};
viewmodel.saveas = function() {
  var now = new Date();
  var time = [dateformat(now, 'yyyymmdd'), 'T', dateformat(now, 'HHMMss')].join('');
  canvas.get(0).toBlob(function(blob) {
    var fn = ['WTTLGenerator', viewmodel.text(), time].join('_') + '.png';
    filesaver.saveAs(blob, fn);
  });
};
viewmodel.getcolor = function(prefix){
  return new iro.Color().hsv(viewmodel[prefix + 'hue'](),
    viewmodel[prefix + 'saturation'](),
    viewmodel[prefix + 'value']());
}
viewmodel.updateflf = function(){
  var flf = flfs[viewmodel.flfname()];
  viewmodel.flfauthor(flf.author);
  viewmodel.flfdate(flf.date);
  viewmodel.flfurl('http://www.figlet.org/fontdb_example.cgi?font=' + viewmodel.flfname() + '.flf');
};
viewmodel.updatelogo = function() {
  var canvas = $('<canvas>').attr('width', 600).attr('height', 100);
  figlet.text('WTTL Generator', { font: 'slant' },
    function(err, data) {
      draw(canvas, pack(canvas, data, 'EmbedOCRA', 10, true, true));
      viewmodel.logo(canvas.get(0).toDataURL());
    });
}
function setfont(ctxw, font, h) {
  // const initialpx = 10;
  // ctxw.set('font', [initialpx + 'px', font].join(' '));
  // var mt = ctxw.baseObject.measureText('A');
  // var adjustpt = (1.0 + (w - mt.raw.width) / w) * initialpx;
  // var font = [adjustpt.toFixed(1) + 'px', font].join(' ');
  // ctxw.set('font', font);
  var font = [h.toFixed(1) + 'px', font].join(' ');
  ctxw.set('font', font);
  console.log('font: ', font);
  return { font: font, mt: ctxw.baseObject.measureText('A') };
}
function normalize(data) {
  var tlines = [], triml = Number.MAX_VALUE, m = null;
  var empty = 0;
  var lns = lines(data);
  lns.forEach(function(l) {
    triml = Math.min(triml, (m = /\s*/.exec(l)) ? m[0].length : 0);
    if (/^\s*$/.test(l)) empty++;
    else empty = 0;
  });
   lns.splice(0, lns.length - empty).forEach(function(l) {
    tlines.push(l.substr(triml));
  });
  return tlines.join('\n');
}
function pack(canvas, data, options) {
  // options
  // - fontfamily <string> (eg. 'Consolas')
  // - fontsize <number> (eg. 10)
  // - fgcolor <string> (eg. '#fff')
  // - bgcolor <string> (eg. '#000')
  // - randomrange <array> (eg. [0.1, 0.2])
  // - randomquality <int> (eg. 5)
  // * set bgcolor = 'transparent', randomquality = 0 to no background

  data = normalize(data);

  var canvasw = parseFloat(canvas.attr('width'));
  var canvash = parseFloat(canvas.attr('height'));

  var items = [];
  var ctx = canvas.get(0).getContext('2d');
  var ctxw = watchobject(ctx);
  var fontinfo = setfont(ctxw, options.fontfamily, options.fontsize);

  var chw = fontinfo.mt.raw.width;
  var chh = fontinfo.mt.fontBoundingBoxAscent + fontinfo.mt.fontBoundingBoxDescent;
  console.log('character W H: ', chw, chh);

  var horzmax = Math.floor(canvasw / chw);
  var vertmax = Math.ceil(canvash / chh);
  var horzn = 0, vertn = 0;
  lines(data).forEach(function(l) {
    horzn = Math.max(horzn, l.length);
    vertn++;
  });
  horzmax = Math.max(horzmax, horzn);
  if (vertmax < vertn) {
    vertmax = Math.max(vertmax, vertn);
  }

  var overflowx = 0, overflowy = -(canvash / chh - vertmax);
  const defaultoverflow = 2;

  horzmax += defaultoverflow; overflowx += defaultoverflow;
  vertmax += defaultoverflow; overflowy += defaultoverflow;
  var horzpad = horzmax - horzn;
  var vertpad = vertmax - vertn;
  if (horzpad % 2 == 1) { horzpad++; horzmax++; overflowx++; }
  if (vertpad % 2 == 1) { vertpad++; vertmax++; overflowy++; }

  console.log('padding H W: ', horzpad, vertpad);
  var plines = [];
  var padl = horzpad / 2;
  var padt = vertpad / 2;
  for (var c = 0; c < padt; c++)
    plines.push(new Array(horzmax + 1).join(space));
  lines(data).forEach(function(l) {
    var pl = new Array(padl + 1).join(space) + l;
    pl = pl + new Array(horzmax - pl.length + 1).join(space);
    plines.push(pl);
  });
  for (var c = 0; c < padt; c++)
    plines.push(new Array(horzmax + 1).join(space));
  var maindata = plines.join('\n');
  items.push({ text: maindata, color:
      new iro.Color().hsv(viewmodel.fghue(), viewmodel.fgsaturation(), viewmodel.fgvalue()).css('hex'),
    });

  var bgcolor = new iro.Color(options.bgcolor);
  function makecolor(n) {
    var step = (options.randomrange[1] - options.randomrange[0]) / options.randomquality;
    var c = new iro.Color(options.fgcolor);
    c.a = step * n + options.randomrange[0];
    return bgcolor.clone().blend(c, 'normal').css('hex');
  }
  var n = 0;
  fragmentdata(randomdata(horzmax, vertmax, maindata), options.randomquality).forEach(function(d) {
    items.push({ text: d, color: makecolor(n++) });
  });
  return {
    overflowx: overflowx,
    overflowy: overflowy,
    chw: chw,
    chh: chh,
    fontinfo: fontinfo,
    background: bgcolor.css('hex'),
    items: items
  };
}
function v2color(v) {
  return '#' + new Array(3 + 1).join("0123456789ABCDEF"[Math.round(v * 15)]);
}
function fragmentdata(data, n) {
  var particles = [];
  for (var d = 0; d < n; d++)
    particles[d] = [];
  for (var c = 0; c < data.length; c++) {
    var r = Math.round(Math.random() * (particles.length - 1));
    for (var d = 0; d < n; d++)
      particles[d].push(data[c] != '\n' && d != r ? space : data[c]);
  }
  return particles.map(function(p) { return p.join(''); });
}
function randomdata(w, h, mask) {
  const cand = '0123456789ABCDEF';
  var lns = [];
  var mlns = lines(mask);
  for (var r = 0; r < h; r++) {
    var l = [];
    for (var c = 0; c < w; c++) {
      if (mlns[r][c] == space)
        l.push(cand.substr(Math.round(Math.random() * (cand.length - 1)), 1));
      else
        l.push(space);
    }
    lns.push(l.join(''));
  }
  return lns.join('\n');
}
function lines(data) {
  return data.split(/\r?\n/);
}
function draw(canvas, pack) {
  var canvasw = parseFloat(canvas.attr('width'));
  var canvash = parseFloat(canvas.attr('height'));
  var ctx = canvas.get(0).getContext('2d');
  var ctxw = watchobject(ctx);
  ctxw.set('fillStyle', pack.background);
  ctxw.set('font', pack.fontinfo.font);
  ctxw.set('textAlign', 'center');
  ctx.fillRect(0, 0, canvasw, canvash);
  pack.items.forEach(function (item) {
    ctxw.set('fillStyle', item.color);
    var y = pack.fontinfo.mt.fontBoundingBoxAscent - pack.overflowy * pack.chh * 0.5;
    item.text.split(/\r?\n/).forEach(function (line) {
      ctx.fillText(line, canvasw / 2, y);
      y += pack.chh;
    });
  });
  ctxw.restore();
};
function watchobject(obj) {
  return {
    modified: { },
    baseObject: obj,
    set: function(p, v) {
      if (!Object.hasOwnProperty(this.modified, p))
        this.modified[p] = this.baseObject[p];
      this.baseObject[p] = v;
    },
    restore: function() {
      for (var p in this.modified)
        this.baseObject[p] = this.modified[p];
      this.modified = { };
    },
  };
}
$(function() {
  canvas = $('<canvas>').attr('width', 1500).attr('height', 500).appendTo('#placeholder');
  knockout.applyBindings(viewmodel);
  viewmodel.updateflf();
  // viewmodel.updatelogo();
  viewmodel.generate();
});
