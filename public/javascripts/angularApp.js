var app = angular.module('teeNews', ['ui.router']);


///////////.state router/////////////

app.config(['$stateProvider', '$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
		$stateProvider
	    .state('home', {
	      url: '/home',
	      templateUrl: '/home.html',
	      controller: 'MainCtrl',
	      resolve: { 
	      	postPromise: ['posts', function(posts){
      			return posts.getAll();
	    		}]
	    	}
	    })

	   	.state('posts', {
			  url: '/posts/{id}',
			  templateUrl: '/posts.html',
			  controller: 'PostsCtrl',
			  resolve: {
			    post: ['$stateParams', 'posts', function($stateParams, posts) {
			      return posts.get($stateParams.id);
			    }]
			  }
			})

			.state('login', {
			  url: '/login',
			  templateUrl: '/login.html',
			  controller: 'AuthCtrl',
			  onEnter: ['$state', 'auth', function($state, auth){
			    if(auth.isLoggedIn()){
			      $state.go('home');
			    }
			  }]
			})

			.state('register', {
				url: '/register',
				templateUrl: '/register.html',
				controller: 'AuthCtrl',
				onEnter: ['$state', 'auth', function($state, auth) {
			    if(auth.isLoggedIn()) {
			      $state.go('home');
			    }
			  }]
			});


	  $urlRouterProvider.otherwise('home');
	}
]);


////////// Main controller//////////

app.controller('MainCtrl', MainCtrl)

MainCtrl.$inject = ['$scope', 'posts', 'auth']

function MainCtrl($scope, posts, auth){
  $scope.addPost = addPost;
  $scope.incrementUpvotes = incrementUpvotes;
  $scope.posts = posts.posts;  //theoretical db in memory
  $scope.isLoggedIn = auth.isLoggedIn;

	function addPost() {
		if(!$scope.title || $scope.title === '') {return alert("Please enter a title.") ;}

		posts.create({
			title: $scope.title, 
			link: $scope.link
		})
		
		$scope.title = ''
		$scope.link = ''
	};

	function incrementUpvotes(post) {
		posts.upvote(post);
	}
};

/////////Posts Controller///////////

app.controller('PostsCtrl', PostsCtrl)

PostsCtrl.$inject = ['$scope', '$stateParams', 'posts', 'post', 'auth']

function PostsCtrl($scope, $stateParams, posts, post, auth) {
	$scope.post = post;
	$scope.incrementUpvotes = incrementUpvotes;
	$scope.addComment = addComment;
	$scope.isLoggedIn = auth.isLoggedIn;

	function incrementUpvotes(comment) {
		posts.upvoteComment(post, comment);
	};


	function addComment() {
		if ($scope.body == '' || !$scope.body) {return alert("Please add a comment.") ;}
		posts.addComment(post._id, {
	    body: $scope.body,
	    author: 'user',
  	})
  	.success(function(comment) {
    	$scope.post.comments.push(comment);
  	});
  	$scope.body = '';
	};
};

////////Authentication Controller////////////////

app.controller('AuthCtrl', AuthCtrl)

AuthCtrl.$inject = ['$scope','$state','auth']

function AuthCtrl($scope, $state, auth) {
  $scope.user = {};

  $scope.register = function(){
    auth.register($scope.user).error(function(error) {
      $scope.error = error;
    })
    .then(function() {
      $state.go('home');
    });
  };

  $scope.logIn = function() {
    auth.logIn($scope.user).error(function(error) {
      $scope.error = error;
    })
    .then(function() {
      $state.go('home');
    });
  };
};

//////nav controller//////
app.controller('NavCtrl', NavCtrl)
NavCtrl.$inject = ['$scope','auth']

function NavCtrl($scope, auth) {
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
};


/*    FACTORIES    */

////////posts factory////////////

app.factory('posts', Posts) 

Posts.$inject = ['$http', 'auth']

function Posts($http, auth) {
	
	var o = {    
		posts: []
	}	
	
	o.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
  	return $http.post('/posts', post, {
  		headers: {Authorization: 'Bearer '+auth.getToken()}
  	})
  	.success(function(data) {
    	o.posts.push(data);
  	});
	};

	o.upvote = function(post) {
  	return $http.put('/posts/' + post._id + '/upvote', null, {
  		headers: {Authorization: 'Bearer '+auth.getToken()}
  	})
  	.success(function(data) {
      post.upvotes += 1;
    });
  };

  o.get = function(id) {
  	return $http.get('/posts/' + id).then(function(res) {
    	return res.data;
  	});
	};

	o.addComment = function(id, comment) {
  	return $http.post('/posts/' + id + '/comments', comment, {
  		headers: {Authorization: 'Bearer '+auth.getToken()}
  	});
	};

	o.upvoteComment = function(post, comment) {
  	return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
  		headers: {Authorization: 'Bearer '+auth.getToken()}
  	})
    .success(function(data) {
      comment.upvotes += 1;
    });
  };

  return o;
};

////// authentication factory ///////////

app.factory('auth', Auth)

Auth.$inject = ['$http', '$window']

function Auth($http, $window) {

  var auth = {};

  auth.saveToken = function (token) {
	  $window.localStorage['tee-news-token'] = token;
	};

	auth.getToken = function () {
	  return $window.localStorage['tee-news-token'];
	};


	auth.isLoggedIn = function() {
  	var token = auth.getToken();

	  if(token){
	    var payload = JSON.parse($window.atob(token.split('.')[1]));

	    return payload.exp > Date.now() / 1000;
	  } 
	  else {
	    return false;
	  }
	};

	auth.currentUser = function() {
	  if(auth.isLoggedIn()) {
	    var token = auth.getToken();
	    var payload = JSON.parse($window.atob(token.split('.')[1]));

	    return payload.username;
	  }
	};

	auth.register = function(user) {
	  return $http.post('/register', user).success(function(data) {
	    auth.saveToken(data.token);
	  });
	};

	auth.logIn = function(user) {
	  return $http.post('/login', user).success(function(data) {
	    auth.saveToken(data.token);
	  });
	};

	auth.logOut = function(){
	  $window.localStorage.removeItem('tee-news-token');
	};

  return auth;
};
 

