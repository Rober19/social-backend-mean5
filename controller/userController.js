'use strict'

// la configuracion previa para el desarrollo
const { resMsg, resJson, admin_secret } = require('../config/config');

const [
  dbUser,
  dbFollow,
  dbPublication
] = [
    require('../model/user'),
    require('../model/follow'),
    require('../model/publication')
  ]
  
// la depnd de encriptamiento para contraseñas
const bcrypt = require('bcrypt-nodejs');
// la depnd de encriptamiento para datos del usuario(en tokens)
const jwt_user = require('../services/jwt');


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

  let {
    name,
    surname,
    nick,
    email,
    password
  } = req.body


  return {
    name,
    surname,
    nick,
    email,
    password: Passcrypt(password),
    role: 'USER',
    logged_in: false,
    times_logged: 0
  }

}

// Este es el metodo de registro
function createUser(req, res) {
  //debemos comprobar si el email o el nick existen en la DB
  let userData = User(req);
  dbUser.findOne({
    //usamos la estructura del OR de mongoose
    $or: [{ email: userData.email }, { nick: userData.nick }]
  }, (err, data) => {
    //aqui retoranremos errores
    if (err) return res.status(500).send(resJson(resMsg.RegisterErr, 500));
    //en caso de encontrar alguno de los 2 datos pues retornara un mensaje de existencia comprobada

    if (data != null) {
      return res.status(400).send(resJson(resMsg.userExist, 400));
    } else {
      //de lo contrario, se tomaran los valores del usuario y se registraran en la DB
      dbUser.create(userData, (err, data) => {
        //si ocurre algun error pues lo retornaremos
        if (err) return res.status(400).send(resJson(resMsg.RegisterErr, 400));
        //sino retornaremos un mensaje exitoso
        req.headers.user = data.id;
        //fetch(`${ip_fetch.temp}/app/create-dir`, { method: 'POST', headers: req.headers });
        //logger('', req.body, resJson(resMsg.userCreateOK, 200), null, null)
        res.status(200).send(resJson(resMsg.userCreateOK, 200));
      });
    }
  });

}
// Este es el metodo de login

function loginUser(req, res) {
  // antes de hacer el login buscaremos si el email registrado existe
  let userData = User(req);
  dbUser.findOne({ email: userData.email }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    if (data != null) {
      // si existe pues procederemos a comprobar la contraseña registrada

      //con esta const podremos ver si la contraseña es correcta o no
      const validateLog = bcrypt.compareSync(req.body.password, data.password);
      if (validateLog) {
        //en caso de que sea correcta se haran los procesoces de logueo y de cifrado tokens        


        if (req.body.tokenget) {
          const toker_reds = jwt_user.createToken(data);
          //client.set(data.nick, toker_reds)
          return res.status(200).send(resJson(toker_reds, 200));
        } else {
          dbUser.findByIdAndUpdate({ _id: data._id }, { times_logged: (data.times_logged + 1) }, { new: true }, (err, data) => { });
          data.password = undefined;
          return res.status(200).send(resJson(data, 200));
        }




      } else {
        //pero en caso de que no simplemente retornaremos que la contraseña es incorrecta
        return res.status(404).send(resJson(resMsg.PasswordErr, 404));
      }
    } else {
      // sino pues evitaremos la comprobacion del resto de datos
      return res.status(404).send(resJson(resMsg.userNotFound, 404));
    }
  });
}

function getUser(req, res) {
  const id_user = req.params.id;

  dbUser.findOne({ _id: id_user }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.requestErr, 500));

    if (data != null) {
      if (req.headers.admin_secret == admin_secret) {
        return res.status(200).send(resJson(jwt_user.createToken(data), 200));
      } else {
        data.password = undefined;

        follow_data(req.user.sub, id_user).then(follow_data => {

          return res.status(200).send(resJson({ data, follow_data }, 200));

        },
          err => {
            return res.status(400).send(resJson(err, 400));
          })

      }
    } else {
      return res.status(200).send(resJson(resMsg.userNotFound, 200));
    }

  });
}

async function getUser_Counters(req, res) {

  let following = await dbFollow.count({
    user: req.params.id
  }, (err, follow) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    return follow;
  });

  let followBack = await dbFollow.count({
    followed: req.params.id
  }, (err, follow) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    return follow;
  });

  let publications = await dbPublication.count({ user: req.params.id }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    return data;
  });

  return res.status(200).send({
    following: following,
    followers: followBack,
    publications: publications
  });

}

async function follow_data(user, followed) {

  let following = await dbFollow.findOne({
    user: user,
    followed: followed
  }, (err, follow) => {
    if (err) return res.status(500).send(resJson(resMsg.userFollowedErr, 500));
    return follow;
  }).select({ '_id': 0, '__v': 0, 'user': 0 });;

  let followBack = await dbFollow.findOne({
    user: followed,
    followed: user
  }, (err, follow) => {
    if (err) return res.status(500).send(resJson(resMsg.userFollowedErr, 500));
    return follow;
  }).select({ '_id': 0, '__v': 0, 'user': 0 });;

  return {
    following: following,
    followed: followBack
  }


}

async function user_follows(user_id) {

  let following = await dbFollow.find({ user: user_id }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    return data;
  }).select({ '_id': 0, '__v': 0, 'user': 0 });

  let followers = await dbFollow.find({ followed: user_id }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));
    return data;
  }).select({ '_id': 0, '__v': 0, 'followed': 0 });

  let following_ids = [];
  following.forEach((follows) => {
    following_ids.push(follows.followed);
  });

  let followers_ids = [];
  followers.forEach((follows) => {
    followers_ids.push(follows.user);
  });

  return {
    following: following_ids,
    followers: followers_ids
  }
}

function getUsers(req, res) {

  let Page = 1;

  if (req.query.page) {
    Page = req.query.page;
  } else {
    return res.status(500).send(resJson(resMsg.requestErr, 500));
  }

  let itemsPerPage = 6;

  dbUser.find({}).select(['-password']).sort('_id').paginate(Page, itemsPerPage, (err, users, total) => {
    if (err) return res.status(500).send(resJson(resMsg.requestErr, 500));

    if (!users) return res.status(404).send(resJson(resMsg.notUsers, 404));

    user_follows(req.user.sub).then((value) => {
      return res.status(200).send({
        users,
        users_following: value.following,
        users_followers: value.followers,
        total,
        pages: Math.ceil(total / itemsPerPage)
      })
    });

  });

}

function updateUser(req, res) {

  const user_id = req.user.sub;
  const data_upt = req.body;

  delete data_upt.password;
  delete data_upt.image;

  if (user_id != req.user.sub) {
    return res.status(500).send(resJson(resMsg.nonAuth, 500));
  }

  dbUser.findOne({ _id: user_id }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));

    if (data != null) {
      dbUser.findByIdAndUpdate({ _id: user_id }, data_upt, { new: true }, (err, data) => {
        if (err) return res.status(500).send(resJson(resMsg.error, 500));
        data.image = undefined;
        return res.status(200).send(resJson(data, 200));

      });

    } else {
      res.status(500).send(resJson(resMsg.userNotFound, 500));
    }

  });


}

function uploadImage(req, res) {

  const user_id = req.user.sub;
  let image_name = req.file_name;

  //const backend = `${ip_fetch.temp}/app/get-image-user/${req.user.sub}/`;

  dbUser.findByIdAndUpdate({ _id: user_id }, { image: `${image_name}` }, { new: true }, (err, data) => {
    if (err) return res.status(500).send(resJson(resMsg.error, 500));

    if (data != null) {
      //para que no aparezca el hash de la contraseña
      data.password = undefined;
      return res.status(200).send(resJson(data, 200));
    } else {
      return res.status(500).send(resJson(resMsg.userNotFound, 500));
    }
  });
}

//#region getImageUser
// async function getImageUser(req, res) {
//   res.redirect(`${ip_fetch.temp}/app/get-image-user/${req.params.id}/${req.params.imageFile}`);
// }
//#endregion 

module.exports = {
  createUser,
  loginUser,
  getUser,
  getUsers,
  updateUser,
  uploadImage,
  getUser_Counters
}
