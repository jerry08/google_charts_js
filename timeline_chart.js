var googlePkgLoaded = false;

    google.charts.load('current', { 'packages': ['timeline'] });
    google.charts.setOnLoadCallback(gLoaded);

    $(window).resize(function () {
        drawChart(lastResult);
    });

    var options = {
        timeline: {
            colorByRowLabel: true
        },
        tooltip: {
            isHtml: true
        },
        width: '100%',
        height: '100%',
    };

    var lastResult = null;

    function gLoaded() {
        googlePkgLoaded = true;
        console.log('loaded');
        drawChart(lastResult);
    }

    function drawChart(result) {
        if (!result) {
            return;
        }

        lastResult = result;

        if (googlePkgLoaded == false) {
            console.log('waiting');
            return;
        }

        var container = document.getElementById('timeline');
        var chart = new google.visualization.Timeline(container);

        //google.visualization.events.addListener(chart, 'ready', afterDraw);
        //google.visualization.events.addListener(chart, 'ready', afterDraw5);

        var dataTable = new google.visualization.DataTable(result.dt);

        var formatDate = new google.visualization.DateFormat({
            pattern: 'dd MMMM yyyy'
        });

        dataTable.insertColumn(2, { type: 'string', role: 'tooltip', p: { html: true } });
        for (var i = 0; i < dataTable.getNumberOfRows(); i++) {
            var duration = Math.abs(dataTable.getValue(i, 6).getTime() - dataTable.getValue(i, 5).getTime()) / 1000;
            //var days = Math.floor(duration / 86400);
            var days = Math.floor(duration / 86400) + 1;
            duration -= days * 86400;

            var tooltip = '';
            tooltip += '<div class="ggl-tooltip"><div>';
            tooltip += '<span>' + dataTable.getValue(i, 1) + '</span>';
            tooltip += '</div><div>';
            tooltip += '<span>' + dataTable.getValue(i, 0) + ':&nbsp;</span>';
            tooltip += formatDate.formatValue(dataTable.getValue(i, 5)) + ' - ';
            tooltip += formatDate.formatValue(dataTable.getValue(i, 6));
            tooltip += '</div><div>';
            tooltip += '<span>Duration:&nbsp;</span>';
            //tooltip += days + ' days ' + hours + ' hours ' + minutes + ' minutes ' + seconds + ' seconds';
            tooltip += days + ' day(s) ';
            tooltip += '</div></div>';
            dataTable.setValue(i, 2, tooltip);
        }

        dataTable.removeColumn(5);
        dataTable.removeColumn(5);

        //chart.draw(dataTable2);
        chart.draw(dataTable, options);
    }

    var toType = function (obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }

    function typeOf(obj) {
        return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
    }

    //var groupBy = function (xs, key) {
    //    return xs.reduce(function (rv, x) {
    //        (rv[x[key]] = rv[x[key]] || []).push(x);
    //        return rv;
    //    }, {});
    //};

    function groupBy(list, keyGetter) {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }

    function getByValue(map, searchValue) {
        for (let [key, value] of map.entries()) {
            if (value === searchValue)
                return key;
        }
    }

    let maxRowsPerPage = 24;

    async function DownloadPdf() {
        var lastData = lastResult;

        var data = JSON.parse(lastResult.dt);
        //console.log(Object.entries(data.rows[6])[0][1][0].v);

        var newDatas = [];

        var myMap = groupBy(data.rows, r => Object.entries(r)[0][1][0].v);
        let keys = Array.from(myMap.keys());

        var newData = {};

        for (var i = 0; i < keys.length; i++) {
            if ((i % maxRowsPerPage) == 0) {
                newData = {};
                newData.cols = data.cols;
                newData.rows = [];

                var rows = myMap.get(keys[i]);
                //console.log(rows.length);
                for (var j = 0; j < rows.length; j++) {
                    newData.rows.push(rows[j]);
                }

                newDatas.push(newData);
            } else {
                var rows = myMap.get(keys[i]);
                for (var j = 0; j < rows.length; j++) {
                    newData.rows.push(rows[j]);
                }
            }
        }

        var container = document.getElementById('timeline');
        //var prevHeight = container.offsetHeight;
        var prevHeight = container.style.height;
        //container.height = 2000;
        container.style.height = '2000px';

        var doc = new jsPDF('p', 'mm');
        //var doc = new jsPDF('p', 'pt', 'letter');

        for (var i = 0; i < newDatas.length; i++) {
            drawChart({ dt: JSON.stringify(newDatas[i]) });

            var maxHeight = 0;
            var maxWidth = 0;

            var container = document.getElementById('timeline');

            //$("#timeline *").each(function () {
            $("#timeline svg").each(function () {
                var thisH = $(this).height();
                if (thisH > maxHeight) { maxHeight = thisH; }

                var thisW = $(this).width();
                if (thisW > maxWidth) { maxWidth = thisW; }
            });

            var canvas = document.getElementById('canvas');
            canvas.width = maxWidth;
            canvas.height = maxHeight;

            var ctx = canvas.getContext("2d");

            var getSVG = container.getElementsByTagName("svg")[1]; // Gets the graph
            if (getSVG == null) {
                getSVG = container.getElementsByTagName("svg")[0];
            }
            getSVG.setAttribute('xmlns', "http://www.w3.org/2000/svg"); // Add attr to svg
            getSVG.setAttribute('xmlns:svg', "http://www.w3.org/2000/svg"); // Add attr to svg

            await drawInlineSVG2(ctx, getSVG.outerHTML).then(function (img) {
                var imgData = canvas.toDataURL('image/png');
                var imgWidth = 190;
                var imgHeight = canvas.height * imgWidth / canvas.width;

                if (i == 0) {
                    //doc.setFontSize(40);
                    ////doc.addHTML($("#chartTitle").outerHTML);
                    //doc.text(35, 25, "tets");

                    var title = document.getElementById('chartTitle').innerHTML;
                    //doc.text(20, 20, title);
                    var textWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                    var textOffset = (doc.internal.pageSize.width - textWidth) / 2;
                    doc.text(textOffset, 20, title);

                    doc.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);
                }
                else {
                    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                }

                if (i < newDatas.length - 1) {
                    doc.addPage();
                }
            });
        }

        //console.log(prevHeight);
        //container.height = prevHeight;
        container.style.height = prevHeight;

        drawChart(lastData);

        doc.save('Timeline Chart.pdf');
    }

    $("#dwnBtn").on('click', function () {
        DownloadPdf();
    });

    function drawInlineSVG(ctx, rawSVG, callback) {

        var svg = new Blob([rawSVG], { type: "image/svg+xml;charset=utf-8" }),
            domURL = self.URL || self.webkitURL || self,
            url = domURL.createObjectURL(svg),
            img = new Image;

        img.onload = function () {
            ctx.drawImage(this, 0, 0);
            domURL.revokeObjectURL(url);
            callback(this);
        };

        img.src = url;
    }

    //Awaitable function
    function blobToBase64(blob) {
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    function drawInlineSVG2(ctx, rawSVG) {

        var img = new Image();

        var svg = new Blob([rawSVG], { type: "image/svg+xml;charset=utf-8" });
        var domURL = self.URL || self.webkitURL || self;
        var url = domURL.createObjectURL(svg);
        
        return new Promise((resolve, _) => {
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                domURL.revokeObjectURL(url);
                resolve(img);
            };
        
            img.src = url;
        });
    }