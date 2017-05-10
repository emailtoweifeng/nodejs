upstream taxi_mysafedrop {
	server 127.0.0.1:8081;
}

server {
	listen 0.0.0.0:80;
	server_name taxi.mysafedrop.com;

	location / {
		auth_basic "Restricted";
		auth_basic_user_file /etc/nginx/.htpasswd;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $http_host;
		proxy_set_header X-NginX-Proxy true;

		proxy_pass http://taxi_mysafedrop/site/;
		proxy_redirect off;

		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
	}
}

server {
	listen 0.0.0.0:80;
	server_name app.taxi.mysafedrop.com;

	location / {
		auth_basic "Restricted";
		auth_basic_user_file /etc/nginx/.htpasswd;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $http_host;
		proxy_set_header X-NginX-Proxy true;

		proxy_pass http://taxi_mysafedrop/;
		proxy_redirect off;

		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
	}
}
