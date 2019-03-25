let app = angular.module("myApp", ['ui.router', 'ui.bootstrap']);

// config untuk library angular-ui-router
app.config(function($stateProvider, $urlRouterProvider, $locationProvider){
    $locationProvider.hashPrefix(''); // untuk ilangin prefix '!' pada url
    
    $stateProvider
        .state("login", {
            url: '/login',
            templateUrl: '/login.html',
            controller: 'loginCtrl',
            onEnter: function($window){$window.document.title = "Login | Movie All Stars"; }
        })
        .state("home", {
            url: '/',
            templateUrl: '/home.html',
            controller: 'homeCtrl',
            onEnter: function($window){$window.document.title = "Home | Movie All Stars"; }
        })
        .state("home.about", {
            url: '^/about',
            templateUrl: '/about.html',
            controller: 'aboutCtrl',
            onEnter: function($window){$window.document.title = "About Me | Movie All Stars"; }
        })
        .state("home.movies", {
            url: '^/movies',
            templateUrl: '/movies.html',
            controller: 'moviesCtrl',
            onEnter: function($window){$window.document.title = "Movie List | Movie All Stars"; }
        })
        .state("home.moviedetail", {
            url: '^/movies/{movieId:[0-9]{1,8}}',
            templateUrl: '/moviedetail.html',
            controller: 'moviedetailCtrl',
            onEnter: function($window){$window.document.title = "Movie Detail | Movie All Stars";},
            resolve: {
                movieId: ['$stateParams', function($stateParams){ return $stateParams.movieId; }]
             }
        });

        // jika url tidak ada yg match
        $urlRouterProvider.otherwise(function($injector, $location){
            if(localStorage.getItem("loggedin") === null || localStorage.getItem("loggedin") == "false")
                return "/login"
            else
                return "/movies"
        });
});


app.controller('homeCtrl', function($scope, $http, $state){
    // jika user force direct ke url ini tanpa login, user akan di direct ke login page.
    if(localStorage.getItem("loggedin") === null || localStorage.getItem("loggedin") === "false"){
        $state.go('login');
        alert("You must login first.");
    }
    else{
        $state.go('.movies');
    }
    //console.log("masuk ke home ctrl");
});

app.controller('aboutCtrl', function($scope, $http, $state){
    //console.log("masuk ke about ctrl");
});

app.factory("loadMoviesFactory", function($http){
    var urlBase = "https://api.themoviedb.org/3/movie";
    var apiKey = "4aacf5ef9b25ee392a822fdccbed9f17";
    var language = "en-US";
    function getMovies(curPage, result){
        result = result || [];
        return $http.get(urlBase+"/now_playing?", {
                params: {
                    'api_key': apiKey,
                    'page': curPage, // will be encoded as &page={{currentPage}}
                    'language': language
                }
            }).then(function(response) {
                if(response.data['results'].length > 0){
                    Array.prototype.push.apply(result, response.data['results']);
                    return getMovies(curPage+1, result);
                }
                return result;
            })
            .catch(function(error){
                alert("something went wrong when trying to get movies data.");
        });
    };

    function getMovieData(movieId){
        return $http.get(urlBase+"/"+movieId+"?", {
            params: {
                'api_key': apiKey,
                'language': language
            }
        }).then(function(response) {
            return response.data;
        }).catch(function(error){
            alert("Movie not found.");
            $state.go('home');
        });
    }

    function getBackdropMovie(movieId){
        return $http.get(urlBase+"/"+movieId+"?", {
            params: {
                'api_key': apiKey,
                'language': language
            }
        }).then(function(response) {
            return "https://image.tmdb.org/t/p/original/"+response.data['backdrop_path'];
        }).catch(function(error){
            alert("Something went wrong when trying to retrieve image.");
        });
    }

    function getPosterMovie(movieId){
        return $http.get(urlBase+"/"+movieId+"?", {
            params: {
                'api_key': apiKey,
                'language': language
            }
        }).then(function(response) {
            return "https://image.tmdb.org/t/p/original/"+response.data['poster_path'];
        }).catch(function(error){
            alert("Something went wrong when trying to retrieve image.");
        });
    }

    return {
        getAllMovies: function(){
            return getMovies(1);
        },
        getMovie: function(movieId){
            return getMovieData(movieId);
        },
        getBackgroundImage: function(movieId){
            return getBackdropMovie(movieId);
        },
        getPosterImage: function(movieId){
            return getPosterMovie(movieId);
        }
    }
});


app.controller('moviesCtrl', function($scope, $http, $state, loadMoviesFactory){
    //console.log("masuk ke movies ctrl");
    $scope.currentPage = 1;
    $scope.moviePerPage = 20;
    $scope.maxSize = 5; // max size pagination tengah yang kelihatan 
    $scope.movies = [];
    $scope.isLoading = true;

    // load data pertama kali
    if(localStorage.getItem("movielist") === null || localStorage.getItem("movielist") === '') 
    {
        $scope.isLoading = true;
        // load data now playing movies dari API
        loadMoviesFactory.getAllMovies().then(function(data){
            //console.log('getAll', data);
            $scope.movies = data;
            localStorage.setItem("movielist", JSON.stringify($scope.movies));
            $scope.isLoading = false;
        });
    }    
    else{ // jika data sudah pernah di load, ga perlu load dari API lagi..
        $scope.movies = JSON.parse(localStorage.getItem("movielist"));
        $scope.isLoading = false;
    }

    $scope.pageChanged = function(){
        //console.log("current page: " + $scope.currentPage);
    }

    $scope.movdetail = function(id){
        //console.log("test");
        state.go('^/movies/'+id);
    }
});

app.controller('moviedetailCtrl', function($scope, $http, $state, $stateParams, loadMoviesFactory){
    var urlnull = "https://image.tmdb.org/t/p/original/null";
    $scope.hasImage = 0; // 0 = ada backdrop, 1 = ga ada backdrop tapi ada poster, 2 = ga ada image.
    $scope.backdropPath = '';
    $scope.posterPath = '';
    $scope.movieId = $stateParams.movieId;
    loadMoviesFactory.getMovie($scope.movieId).then(function(data){
        //console.log('get movie', data);     
        $scope.movieData = data;
        loadMoviesFactory.getBackgroundImage($scope.movieId).then(function(data){
            if(data != urlnull){ 
                $scope.backdropPath = data;
            }
            else{
                $scope.hasImage = 1;
                loadMoviesFactory.getPosterImage($scope.movieId).then(function(data){
                    if(data != urlnull) $scope.posterPath = data;
                    else $scope.hasImage = 2;
                });    
            }
        });

        if($scope.movieData['tagline'] == "") $scope.hasTagline = false;
        else $scope.hasTagline = true;

        if($scope.movieData['overview'] == "") $scope.hasOverview = false;
        else $scope.hasOverview = true;

        if($scope.movieData['production_companies'].length == 0) $scope.hasProduction = false;
        else $scope.hasProduction = true;

        if($scope.movieData['genres'].length == 0) $scope.hasGenres = false;
        else $scope.hasGenres = true;

        if($scope.movieData['homepage'] == null) $scope.hasWebsite = false;
        else $scope.hasWebsite = true;
    });
});

app.controller('loginCtrl', function($scope, $http, $state, loadMoviesFactory){
    $scope.isInvalid = false;
    localStorage.setItem("username", "user");
    localStorage.setItem("password", "uaspti");
    localStorage.setItem("loggedin", "false"); // untuk cek apakah sudah login atau blm, biar user ga bisa force direct ke url lain
    
    loadMoviesFactory.getBackgroundImage(335983).then(function(data){
        $scope.bgImage = data;
    });

    $scope.showPassword = function(){
        if ($('#formPasswordInput').attr('type') == "password")
            $('#formPasswordInput').attr('type', "text");
        else 
            $('#formPasswordInput').attr('type', "password");
    }

    $scope.resetForm = function(){
        $scope.username = '';
        $scope.password = '';
    }

    $scope.loginFormSubmit = function(){
        if($scope.loginForm.$valid && $scope.username == localStorage.getItem("username") && $scope.password == localStorage.getItem("password")){
            $scope.isInvalid = false;
            localStorage.setItem("loggedin", "true");
            $state.go('home');
        }
        else{
            $scope.isInvalid = true;
            localStorage.setItem("loggedin", "false");
        }
    }
});


// make uib-pagination works on bootstrap 4.0
// source: https://stackoverflow.com/questions/17994490/angular-ui-bootstrap-pagination-not-rendered-missing-styles
angular.module("uib/template/pagination/pagination.html", []).run(["$templateCache", function($templateCache) {
    $templateCache.put("uib/template/pagination/pagination.html",
      "<li role=\"menuitem\" ng-if=\"::boundaryLinks\" ng-class=\"{disabled: noPrevious()||ngDisabled}\" class=\"page-item pagination-first\"><a href ng-click=\"selectPage(1, $event)\" ng-disabled=\"noPrevious()||ngDisabled\" class='page-link' uib-tabindex-toggle>{{::getText('first')}}</a></li>\n" +
      "<li role=\"menuitem\" ng-if=\"::directionLinks\" ng-class=\"{disabled: noPrevious()||ngDisabled}\" class=\"page-item pagination-prev\"><a href ng-click=\"selectPage(page - 1, $event)\" ng-disabled=\"noPrevious()||ngDisabled\" class='page-link' uib-tabindex-toggle>{{::getText('previous')}}</a></li>\n" +
      "<li role=\"menuitem\" ng-repeat=\"page in pages track by $index\" ng-class=\"{active: page.active,disabled: ngDisabled&&!page.active}\" class=\"page-item pagination-page\"><a href ng-click=\"selectPage(page.number, $event)\" class='page-link' ng-disabled=\"ngDisabled&&!page.active\" uib-tabindex-toggle>{{page.text}}</a></li>\n" +
      "<li role=\"menuitem\" ng-if=\"::directionLinks\" ng-class=\"{disabled: noNext()||ngDisabled}\" class=\"page-item pagination-next\"><a href ng-click=\"selectPage(page + 1, $event)\" class='page-link' ng-disabled=\"noNext()||ngDisabled\" uib-tabindex-toggle>{{::getText('next')}}</a></li>\n" +
      "<li role=\"menuitem\" ng-if=\"::boundaryLinks\" ng-class=\"{disabled: noNext()||ngDisabled}\" class=\"page-item pagination-last\"><a href ng-click=\"selectPage(totalPages, $event)\" class='page-link' ng-disabled=\"noNext()||ngDisabled\" uib-tabindex-toggle>{{::getText('last')}}</a></li>\n" +
      "");
  }]);