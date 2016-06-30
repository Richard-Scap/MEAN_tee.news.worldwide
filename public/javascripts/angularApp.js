var app = angular.module('teeNews', ['ui.router']);


///////////router/////////////

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


	  $urlRouterProvider.otherwise('home');
	}
]);


////////// Main controller//////////

app.controller('MainCtrl', MainCtrl)

MainCtrl.$inject = ['$scope', 'posts']

function MainCtrl($scope, posts){
  $scope.addPost = addPost;
  $scope.incrementUpvotes = incrementUpvotes;
  $scope.test = 'Hello world!';
  $scope.posts = posts.posts;  //theoretical db in memory

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

PostsCtrl.$inject = ['$scope', '$stateParams', 'posts', 'post']

function PostsCtrl($scope, $stateParams, posts, post) {
	$scope.post = post;
	$scope.incrementUpvotes = incrementUpvotes;
	$scope.addComment = addComment;

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

////////posts factory////////////

app.factory('posts', Posts) 

Posts.$inject = ['$http']

function Posts($http) {
	
	var o = {    
		posts: []
	}	
	
	o.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
  	return $http.post('/posts', post).success(function(data) {
    	o.posts.push(data);
  	});
	};

	o.upvote = function(post) {
  	return $http.put('/posts/' + post._id + '/upvote').success(function(data) {
      post.upvotes += 1;
    });
  };

  o.get = function(id) {
  	return $http.get('/posts/' + id).then(function(res){
    	return res.data;
  	});
	};

	o.addComment = function(id, comment) {
  	return $http.post('/posts/' + id + '/comments', comment);
	};

	o.upvoteComment = function(post, comment) {
  return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote')
    .success(function(data){
      comment.upvotes += 1;
    });
};

  return o;
};



 

