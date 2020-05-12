{-|
  Eyre: Http Server Driver
-}

module Urbit.Vere.Eyre.Multi
  ( WhichServer(..)
  , MultiEyreConf(..)
  , OnMultiReq
  , OnMultiKil
  , MultiEyreApi(..)
  , joinMultiEyre
  , leaveMultiEyre
  , multiEyre
  )
where

import Urbit.Prelude hiding (Builder)

import Urbit.Arvo           hiding (ServerId, reqUrl, secure)
import Urbit.Vere.Eyre.Serv
import Urbit.Vere.Eyre.Wai

import Network.TLS (Credential)


-- Types -----------------------------------------------------------------------

data WhichServer = Secure | Insecure | Loopback
  deriving (Eq)

data MultiEyreConf = MultiEyreConf
  { mecHttpsPort :: Maybe Port
  , mecHttpPort :: Maybe Port
  , mecLocalhostOnly :: Bool
  }

type OnMultiReq = WhichServer -> Ship -> Word64 -> ReqInfo -> STM ()

type OnMultiKil = Ship -> Word64 -> STM ()

data MultiEyreApi = MultiEyreApi
  { meaConf :: MultiEyreConf
  , meaLive :: TVar LiveReqs
  , meaPlan :: TVar (Map Ship OnMultiReq)
  , meaCanc :: TVar (Map Ship OnMultiKil)
  , meaTlsC :: TVar (Map Ship Credential)
  , meaKill :: STM ()
  }


-- Multi-Tenet HTTP ------------------------------------------------------------

joinMultiEyre
  :: MultiEyreApi
  -> Ship
  -> Maybe TlsConfig
  -> OnMultiReq
  -> OnMultiKil
  -> STM ()
joinMultiEyre api who mTls onReq onKil = do
  modifyTVar' (meaPlan api) (insertMap who onReq)
  modifyTVar' (meaCanc api) (insertMap who onKil)
  for_ mTls $ \tls -> do
    configCreds tls & \case
      Left err -> pure ()
      Right cd -> modifyTVar' (meaTlsC api) (insertMap who cd)

leaveMultiEyre :: MultiEyreApi -> Ship -> STM ()
leaveMultiEyre MultiEyreApi {..} who = do
  modifyTVar' meaCanc (deleteMap who)
  modifyTVar' meaPlan (deleteMap who)
  modifyTVar' meaTlsC (deleteMap who)

multiEyre :: HasLogFunc e => MultiEyreConf -> RIO e MultiEyreApi
multiEyre conf@MultiEyreConf{..} = do
  vLive <- newTVarIO emptyLiveReqs
  vPlan <- newTVarIO mempty
  vCanc <- newTVarIO (mempty :: Map Ship (Ship -> Word64 -> STM ()))
  vTlsC <- newTVarIO mempty

  let host = if mecLocalhostOnly then SHLocalhost else SHAnyHostOk

  let onReq :: WhichServer -> Ship -> Word64 -> ReqInfo -> STM ()
      onReq which who reqId reqInfo = do
        plan <- readTVar vPlan
        lookup who plan & \case
          Nothing -> pure ()
          Just cb -> cb which who reqId reqInfo

  let onKil :: Ship -> Word64 -> STM ()
      onKil who reqId = do
        canc <- readTVar vCanc
        lookup who canc & \case
          Nothing -> pure ()
          Just cb -> cb who reqId

  mIns <- for mecHttpPort $ \por -> serv vLive $ ServConf
    { scHost = host
    , scPort = SPChoices $ singleton $ fromIntegral por
    , scRedi = Nothing -- TODO
    , scType = STMultiHttp $ ReqApi
        { rcReq = onReq Insecure
        , rcKil = onKil
        }
    }

  mSec <- for mecHttpsPort $ \por -> serv vLive $ ServConf
    { scHost = host
    , scPort = SPChoices $ singleton $ fromIntegral por
    , scRedi = Nothing
    , scType = STMultiHttps vTlsC $ ReqApi
        { rcReq = onReq Secure
        , rcKil = onKil
        }
    }

  pure $ MultiEyreApi
    { meaLive = vLive
    , meaPlan = vPlan
    , meaCanc = vCanc
    , meaTlsC = vTlsC
    , meaConf = conf
    , meaKill = traverse_ saKil (toList mIns <> toList mSec)
    }
