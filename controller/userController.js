'use strict'

// la configuracion previa para el desarrollo
const config = require('../config/config');
// la depnd de paginacion
const dbPaginate = require('mongoose-pagination');
// el modelo USUARIO de mongoose
const dbUser = require('../model/user');
// la depnd de encriptamiento para contraseñas
const bcrypt = require('bcrypt-nodejs');
// la depnd de encriptamiento para datos del usuario(en tokens)
const jwt_user = require('../services/jwt');
// la depnd de creacion de tokens
const jwt = require('jwt-simple');
// libreria para trabajar con archivos FILE SYSTEM
const fs = require('fs');
// trabajar con rutas del sistema de ficheros
const path = require('path');
//

// validador de la contraseña traida por el req.body
function Passcrypt(password) {
  if (password) {
    return bcrypt.hashSync(password);
  } else {
    return null;
  }
}
//funcion para retornar usuario
function User(req) {
  //usuario previamente creado para generar el usuario que irá a la base de datos
  const user = {
    name: req.body.name,
    surname: req.body.surname,
    nick: req.body.nick,
    email: req.body.email,
    password: Passcrypt(req.body.password),
    image: 'https://backend-mean5-project.herokuapp.com/app/get-image-user/default-user.png'
  }
  return user;
}

// ESTO ESTA OBSOLETO HASTA EL MOMENTO
function findUser(filter) {

  var a = 777;
  console.log(1);
  dbUser.findOne(filter, (err, data) => {
    if (err) return err;
    if (data != null) return console.log(2);

  });
  console.log(3);
  console.log('pasé')
  return a;
}

// Este es el metodo de registro
function createUser(req, res) {
  //debemos comprobar si el email o el nick existen en la DB
  dbUser.findOne({
    //usamos la estructura del OR de mongoose
    $or: [{ email: User(req).email }, { nick: User(req).nick }]
  }, (err, data) => {
    //aqui retoranremos errores
    if (err) return res.status(500).send(config.resJson(config.resMsg.RegisterErr, 500));
    //en caso de encontrar alguno de los 2 datos pues retornara un mensaje de existencia comprobada
    if (data != null) {
      return res.status(400).send(config.resJson(config.resMsg.userExist, 400));
    } else {
      //de lo contrario, se tomaran los valores del usuario y se registraran en la DB
      dbUser.create(User(req), (err, data) => {
        //si ocurre algun error pues lo retornaremos
        if (err) return res.status(400).send(config.resJson(config.resMsg.RegisterErr, 400));
        //sino retornaremos un mensaje exitoso
        res.status(200).send(config.resJson(config.resMsg.userCreateOK, 200));
      });
    }

  });

}
// Este es el metodo de login
function loginUser(req, res) {
  // antes de hacer el login buscaremos si el email registrado existe
  dbUser.findOne({ email: User(req).email }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.error, 500));
    if (data != null) {
      // si existe pues procederemos a comprobar la contraseña registrada

      //con esta const podremos ver si la contraseña es correcta o no
      const validateLog = bcrypt.compareSync(req.body.password, data.password);
      if (validateLog) {
        //en caso de que sea correcta se haran los procesoces de logueo y de cifrado tokens
        if (req.body.tokenget) {
          return res.status(200).send(config.resJson(jwt_user.createToken(data), 200));
        } else {
          data.password = undefined;
          return res.status(200).send(config.resJson(data, 200));
        }


      } else {
        //pero en caso de que no simplemente retornaremos que la contraseña es incorrecta
        return res.status(404).send(config.resJson(config.resMsg.PasswordErr, 404));
      }
    } else {
      // sino pues evitaremos la comprobacion del resto de datos
      return res.status(404).send(config.resJson(config.resMsg.userNotFound, 404));
    }
  });
}

function getUser(req, res) {
  const id_user = req.params.id;

  dbUser.findOne({ _id: id_user }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.requestErr, 500));

    if (data != null) {
      if (req.body.tokenget) {
        return res.status(200).send(config.resJson(jwt_user.createToken(data), 200));
      } else {
        data.password = undefined;
        return res.status(200).send(config.resJson(data, 200));
      }
    } else {
      return res.status(200).send(config.resJson(config.resMsg.userNotFound, 200));
    }

  });
}

function getUsers(req, res) { 

  let Page = 1;

  if (req.query.page) {
    Page = req.query.page;
  } else {
    return res.status(500).send(config.resJson(config.resMsg.requestErr, 500));
  }

  let itemsPerPage = 5;

  dbUser.find({}).select(['-password']).sort('_id').paginate(Page, itemsPerPage, (err, users, total) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.requestErr, 500));

    if (!users) return res.status(404).send(config.resJson(config.resMsg.notUsers, 404));
    
    return res.status(200).send({
      users,
      total,
      pages: Math.ceil(total / itemsPerPage)
    })
  });

}

function updateUser(req, res) {

  const user_id = req.user.sub;
  const data_upt = req.body;

  delete data_upt.password;
  delete data_upt.image;

  if (user_id != req.user.sub) {
    return res.status(500).send(config.resJson(config.resMsg.nonAuth, 500));
  }

  dbUser.findOne({ _id: user_id }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.error, 500));

    if (data != null) {
      dbUser.findByIdAndUpdate({ _id: user_id }, data_upt, { new: true }, (err, data) => {
        if (err) return res.status(500).send(config.resJson(config.resMsg.error, 500));
        data.image = undefined;
        return res.status(200).send(config.resJson(data, 200));

      });

    } else {
      res.status(500).send(config.resJson(config.resMsg.userNotFound, 500));
    }

  });


}

function uploadImage(req, res) {

  const user_id = req.user.sub;
  let image_name = req.file_name;
  const img_user = image_name.split('\--');
  const heroku_backend = 'https://backend-mean5-project.herokuapp.com/app/get-image-user/'

  const path_file = './uploads/users/' + image_name;

  fs.renameSync(path_file, `./uploads/users/${img_user[0]}${img_user[2]}`);
  image_name = `${img_user[0]}${img_user[2]}`;

  dbUser.findByIdAndUpdate({ _id: user_id }, { image: `${heroku_backend}${image_name}` }, { new: true }, (err, data) => {
    if (err) return res.status(500).send(config.resJson(config.resMsg.error, 500));
    
    if (data != null) {
      //este es el id del usuario descifrado de la imagen
      const img_id_user = jwt.decode(img_user[0], 'packet');

      //para que no aparezca el hash de la contraseña
      data.password = undefined;
      return res.status(200).send(config.resJson(data, 200));

    } else {
      return res.status(500).send(config.resJson(config.resMsg.userNotFound, 500));
    }



  });
}

function getImageUser(req, res) {
  const image_file = req.params.imageFile;
  const path_file = './uploads/users/' + image_file;

  if (image_file) {
    fs.exists(path_file, (data) => {
      if (data) {
        res.status(200).sendFile(path.resolve(path_file));
      } else {
        return res.status(500).send(config.resJson(config.resMsg.notfound, 500));
      }
    });
  } else {
    return res.status(500).send(config.resJson(config.resMsg.notfound, 500));
  }
}


//esto es PARA UNA PRUEBA - ES OBSOLETO
function halo(req, res) {
  const halo1 = findUser({ email: User(req).email });
  res.status(200).send({ halo1 })
}


module.exports = {
  createUser,
  loginUser,
  getUser,
  getUsers,
  updateUser,
  uploadImage,
  getImageUser
}
