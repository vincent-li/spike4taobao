(function($){
    var s,e,timer;
    $(document).ready(function(){
        s = $('#_start');
        e = $('#_end');
        delegateEvents();
        console.log(chrome.tabs.captureVisibleTab);
    });
    function delegateEvents(){
        s.on('click',function(){
            timer = window.setInterval(function(){
                refreshSpike();
            },200);
            s.parent().addClass('display-none');
            e.parent().removeClass('display-none');
        });
        e.on('click',function(){
            clean();
            s.parent().removeClass('display-none');
            e.parent().addClass('display-none');
        });
    }
    function submit(){

    }
    
    function refreshSpike(){
        // var refresh = $('');
        var question = $('.question-img');
        // if(refresh){
        //     refresh.click();
        // }
        if(question && question.attr('src')){
            clean();
            autoSpike();
        }
    }
    function clean(){
        if(timer){
            window.clearInterval(timer);
            timer = null;
        }
    }
    function autoSpike(){
        var answer = Analysis.getAnswer();
    }
    var Analysis = {
        ctx  : null,
        imgData : null,
        eve  : [],
        getAnswer : function(data){
            this.getImageData();
            var answer = this.analysis();
            return answer;
        },
        analysis : function(imgdata){
            //降噪
            // this.
            // 除去干扰线。
            this.clearInterferenceLines();
            //2值化图片信息
            //细化图像
            //分隔
            //智能匹配
            //语法分析
            //返回答案
            return null;
        },
        clearInterferenceLines : function(x,y){
            // console.log(this.imgData.data);
            var w = this.imgData.width;
            var h = this.imgData.height;
            var W  = {R:255,G:255,B:255};//白色RGB对象，没有opacity值
            var WH = {R:255,G:255,B:255,O:0};//白色，隐藏色点。
            var PS = this.samplingLine();
            console.log(PS);
            for (var x = w - 1; x >= 0; x--) {
                for (var y = h - 1; y >= 0; y--) {
                    var P = this.getPointPixel(x,y);
                    if(this.indexOfPixel(P,PS) > -1){
                        this.setPointPixel(x,y,WH);
                    }
                };
            };
            // this.ctx.putImageData(this.imgData);
            this.drawImage();

        },
        samplingLine : function(){
            var w = this.imgData.width;
            var h = this.imgData.height;
            var W  = {R:255,G:255,B:255};//白色RGB对象，没有opacity值
            var PS = [];
            for (var x = w - 1; x >= 0; x--) {
                for (var y = h - 1; y >= 0; y--) {
                    var P = this.getPointPixel(x,y);
                    if(x > (w-10)){
                        if(!this.comparePixel(P,W) && this.indexOfPixel(P,PS) < 0){
                            PS.push(P);
                        }
                    }else{
                        return PS;
                    }
                };
            };
        },
        indexOfPixel : function(P,PS){
            if(PS && PS.length){
                for (var i = PS.length - 1; i >= 0; i--) {
                    var temp = PS[i];
                    if(this.comparePixel(temp,P)){
                        return i;
                    }
                };
            }   
            return -1;
        },
        comparePixel : function(P0,P1){
            if(P0.R==P1.R&&P0.G==P1.G&&P0.B==P1.B){
                return true;
            }
            return false;
        },
        getPointPixel : function(x,y){
            var i = (y*this.imgData.width+x)*4;
            var data = this.imgData.data;
            var Pixel = {
                R : data[i],
                G : data[i+1],
                B : data[i+2],
                O : data[i+3]
            }
            return Pixel;
        },
        setPointPixel : function(x,y,Pixel){
            var i = (y*this.imgData.width+x)*4;
            // var data = this.imgData.data;
            this.imgData.data[i]   = Pixel.R;
            this.imgData.data[i+1] = Pixel.G;
            this.imgData.data[i+2] = Pixel.B;
            this.imgData.data[i+3] = Pixel.O; 
        },
        getImageData : function(){
            //获取验证码图片
            var ques = $('.question-img');
            //获取cavas对象
            var canvas = $('#analysis')[0];
            this.ctx = canvas.getContext("2d");
            //获取img对象
            var img = ques[0];
            //获取img width,height
            var w = img.width;
            var h = img.height;
            //把图片画在canvas上以便获取图片像素信息
            this.ctx.drawImage(img, 0, 0, w, h);
            //获取图片数据信息
            var imgdata = this.ctx.getImageData(0,0,w,h);
            this.ctx.save();
            //验证初始化数据
            if(imgdata.data){
                this.imgData = imgdata;
                //循环处理数据，倒序循环效率高。
                for (var j = h - 1; j >= 0; j--) {
                    for (var i = w - 1; i >= 0; i--) {
                        var pixel = this.getPointPixel(i,j);
                        this.eve[j*w+i] = (pixel.R+pixel.G+pixel.B)/3;
                    }
                }
                
            }
        },
        drawImage : function(){
            this.ctx.putImageData(this.imgData,0,0);
            this.ctx.stroke();
            this.ctx.restore();
        }
    };
})(jQuery);