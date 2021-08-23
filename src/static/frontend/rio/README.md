#README

---

以下命令请cd到working目录$project_root/src/static/frontend  


### Start

- 安装nodejs
	https://nodejs.org/
- 安装grunt
	npm install -g grunt-cli
- 安装grunt插件
	npm install
- 安装bower
	npm install bower -g
- 安装项目依赖库
	bower install

###安装 ruby&sass&compass
－ ruby
	google...
	ruby安装成功后，如果gem install速度过慢，可以使用taobao－gem源
		gem sources --remove https://rubygems.org/
		gem sources -a https://ruby.taobao.org/
		gem sources -l
－ sass
	gem install sass
－ compass
	gem update --system
	gem install compass

if install failed and the error logs states is 'You have to install development tools first', then should install xcode and try 'xcode-select --install'

###常用task

- grunt reload
	自动将src下js文件link注入到html中
- grunt wiredep
	自动项目依赖的库文件link注入到html中
- grunt watch:styles
	监听less文件变化，并编译less文件






