Nervatura Node Demo App
=========================

Open Source Business Management Framework

Please see more the [Nervatura Docs](https://nervatura.github.io/nervatura/)

This demo application works on Linux x64 and Windows x64 systems!

## Installation

    $ git clone https://github.com/nervatura/nervatura-express.git nervatura
    $ cd nervatura
    $ npm install

## Configuration Options

The application uses environment variables to set configuration options (app_dir/.env). It will be read from the [.env.example](https://github.com/nervatura/nervatura-service/blob/master/.env.example) file. Set the environment variables as needed!
## Quick Start

1. Start the Node and Nervatura backend server

```
  $ NODE_ENV=development node server.js
```

2. Create a new demo database. 
You can use the [http://localhost:5000/admin/](http://localhost:5000/admin/) Database section:

API-KEY: **NODE_API_KEY** (.env file ```NT_API_KEY``` value)<br />
Alias name: **demo**<br />
Demo database: **true**

3. Service HTTP API interface: [http://localhost:5000/client/](http://localhost:5000/client/)

Username: **admin**<br />
Password: **Empty password**<br />
Database: **demo**

4. CLI (command line) interface: [http://localhost:8080/](http://localhost:8080/)

Username: **admin**<br />
Password: **Empty password**<br />
Database: **demo**<br />
Server URL: **http://localhost:8080/cli**

5. gRPC interface: [http://localhost:8080/](http://localhost:8080/)

Username: **admin**<br />
Password: **Empty password**<br />
Database: **demo**<br />
Server URL: **http://localhost:8080/rpc**
